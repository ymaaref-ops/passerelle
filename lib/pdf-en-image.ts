/**
 * Le modèle qui lit les documents (Qwen-VL) ne lit que des images : on transforme un PDF en une image PNG
 * (ses premières pages l'une sous l'autre), dans le navigateur, juste avant l'envoi.
 * pdf.js est chargé à la demande depuis un CDN, seulement quand un PDF est envoyé.
 */
const VERSION = '4.10.38'
const BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${VERSION}/build`
const PAGES_MAX = 3
const LARGEUR_CIBLE = 1400

type PdfJs = {
  GlobalWorkerOptions: { workerSrc: string }
  getDocument: (src: { data: ArrayBuffer }) => { promise: Promise<any> }
}

let chargement: Promise<PdfJs> | null = null

function chargerPdfJs(): Promise<PdfJs> {
  if (!chargement) {
    // Import dynamique d'une adresse externe, hors du bundle.
    const importer = new Function('u', 'return import(u)') as (u: string) => Promise<PdfJs>
    chargement = importer(`${BASE}/pdf.min.mjs`).then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = `${BASE}/pdf.worker.min.mjs`
      return pdfjs
    })
    chargement.catch(() => {
      chargement = null
    })
  }
  return chargement
}

export async function pdfVersImage(fichier: File): Promise<File> {
  const pdfjs = await chargerPdfJs()
  const pdf = await pdfjs.getDocument({ data: await fichier.arrayBuffer() }).promise
  const nb = Math.min(pdf.numPages, PAGES_MAX)
  const pages: HTMLCanvasElement[] = []
  for (let i = 1; i <= nb; i++) {
    const page = await pdf.getPage(i)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: LARGEUR_CIBLE / base.width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas indisponible')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport }).promise
    pages.push(canvas)
  }
  const final = document.createElement('canvas')
  final.width = Math.max(...pages.map((c) => c.width))
  final.height = pages.reduce((h, c) => h + c.height, 0)
  const ctx = final.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponible')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, final.width, final.height)
  let y = 0
  for (const c of pages) {
    ctx.drawImage(c, 0, y)
    y += c.height
  }
  const blob = await new Promise<Blob | null>((r) => final.toBlob(r, 'image/png'))
  if (!blob) throw new Error('Conversion impossible')
  return new File([blob], fichier.name.replace(/\.pdf$/i, '') + '.png', { type: 'image/png' })
}
