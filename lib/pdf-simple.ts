// Petit générateur de PDF sans bibliothèque (A4, Helvetica), pour les documents de Passerelle :
// titres, paragraphes, lignes « libellé … montant », tableaux, cases à cocher, sur plusieurs pages.

export type Bloc =
  | { type: 'titre'; texte: string }
  | { type: 'sousTitre'; texte: string }
  | { type: 'paragraphe'; texte: string; gras?: boolean }
  | { type: 'note'; texte: string }
  | { type: 'lignes'; lignes: [string, string][] }
  | { type: 'total'; libelle: string; valeur: string; accent?: boolean }
  | { type: 'resume'; elements: [string, string][] }
  | { type: 'tableau'; entetes: string[]; lignes: string[][]; largeurs: number[]; droite?: number[] }
  | { type: 'cases'; elements: [boolean, string][] }
  | { type: 'espace'; hauteur?: number }

const L = 595.28
const H = 841.89
const MARGE = 50
const UTILE = L - 2 * MARGE

const NUIT: [number, number, number] = [0.118, 0.106, 0.42]
const TEXTE: [number, number, number] = [0.16, 0.15, 0.32]
const GRIS: [number, number, number] = [0.42, 0.41, 0.55]
const LAVANDE: [number, number, number] = [0.937, 0.933, 0.988]
const LAVANDE_FONCE: [number, number, number] = [0.86, 0.85, 0.97]
const VERT: [number, number, number] = [0.18, 0.55, 0.38]

/** Largeurs Helvetica approximatives (millièmes de la taille), suffisantes pour couper et aligner. */
function largeurCar(c: string, gras: boolean): number {
  if (/[0-9]/.test(c) || c === '€' || c === '$') return 556
  if (c === ' ' || c === '\u00a0' || c === '\u202f' || c === ',' || c === '.' || c === ':' || c === ';' || c === "'" || c === '’') return 278
  if (/[il|!]/.test(c)) return gras ? 280 : 222
  if (/[fjtrI]/.test(c)) return gras ? 333 : 300
  if (/[mwMW]/.test(c)) return gras ? 889 : 833
  if (/[A-Z]/.test(c) || /[ÀÂÉÈÊÔÙÛÇŒ]/.test(c)) return gras ? 722 : 667
  if (c === '%') return 889
  if (c === '-' || c === '–' || c === '(' || c === ')') return 333
  return gras ? 611 : 540
}

export function largeur(texte: string, taille: number, gras = false): number {
  let total = 0
  for (const c of texte) total += largeurCar(c, gras)
  return (total / 1000) * taille
}

function couper(texte: string, taille: number, max: number, gras = false): string[] {
  const lignes: string[] = []
  for (const paragraphe of texte.split('\n')) {
    const mots = paragraphe.split(' ')
    let ligne = ''
    for (const mot of mots) {
      const essai = ligne ? `${ligne} ${mot}` : mot
      if (largeur(essai, taille, gras) > max && ligne) {
        lignes.push(ligne)
        ligne = mot
      } else ligne = essai
    }
    lignes.push(ligne)
  }
  return lignes
}

/** Caractère → octet WinAnsi (accents français, €, guillemets, tirets). */
const SPECIAUX: Record<string, number> = {
  '€': 0x80, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
  'œ': 0x9c, 'Œ': 0x8c, '\u202f': 0xa0, '\u2009': 0x20,
}

function versWinAnsi(texte: string): string {
  let s = ''
  for (const c of texte) {
    const code = c.charCodeAt(0)
    const octet = SPECIAUX[c] ?? (code < 256 ? code : 0x3f)
    const car = String.fromCharCode(octet)
    s += car === '(' || car === ')' || car === '\\' ? `\\${car}` : car
  }
  return s
}

const rgb = (c: [number, number, number]) => c.map((v) => v.toFixed(3)).join(' ')

class Pages {
  pages: string[] = []
  flux = ''
  y = H - MARGE

  constructor(private titreDoc: string) {
    this.nouvelle()
  }

  nouvelle() {
    if (this.flux) this.pages.push(this.flux)
    this.flux = ''
    // Bandeau Passerelle
    this.rect(0, H - 34, L, 34, LAVANDE)
    this.texte('Passerelle', MARGE, H - 22, 11, true, NUIT)
    const t = this.titreDoc
    this.texte(t, L - MARGE - largeur(t, 9), H - 22, 9, false, GRIS)
    this.y = H - 34 - 36
  }

  place(hauteur: number) {
    if (this.y - hauteur < MARGE + 20) this.nouvelle()
  }

  rect(x: number, y: number, l: number, h: number, couleur: [number, number, number]) {
    this.flux += `${rgb(couleur)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${l.toFixed(2)} ${h.toFixed(2)} re f\n`
  }

  cadre(x: number, y: number, l: number, h: number, couleur: [number, number, number], ep = 1) {
    this.flux += `${rgb(couleur)} RG ${ep} w ${x.toFixed(2)} ${y.toFixed(2)} ${l.toFixed(2)} ${h.toFixed(2)} re S\n`
  }

  trait(x1: number, y1: number, x2: number, y2: number, couleur: [number, number, number], ep = 1) {
    this.flux += `${rgb(couleur)} RG ${ep} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`
  }

  texte(t: string, x: number, y: number, taille: number, gras = false, couleur = TEXTE) {
    this.flux += `BT ${rgb(couleur)} rg /${gras ? 'F2' : 'F1'} ${taille} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${versWinAnsi(t)}) Tj ET\n`
  }

  fin(): string[] {
    this.pages.push(this.flux)
    // Numéros de page
    return this.pages.map((p, i) => {
      const n = `Page ${i + 1} sur ${this.pages.length}`
      return `${p}BT ${rgb(GRIS)} rg /F1 8 Tf ${(L - MARGE - largeur(n, 8)).toFixed(2)} 28 Td (${versWinAnsi(n)}) Tj ET\n`
    })
  }
}

function dessiner(p: Pages, b: Bloc) {
  switch (b.type) {
    case 'titre': {
      const lignes = couper(b.texte, 20, UTILE, true)
      p.place(lignes.length * 25 + 10)
      for (const l of lignes) {
        p.texte(l, MARGE, p.y - 18, 20, true, NUIT)
        p.y -= 25
      }
      p.y -= 8
      break
    }
    case 'sousTitre':
      p.place(30)
      p.y -= 8
      p.texte(b.texte.toUpperCase(), MARGE, p.y - 10, 9.5, true, NUIT)
      p.trait(MARGE, p.y - 15, L - MARGE, p.y - 15, LAVANDE_FONCE)
      p.y -= 26
      break
    case 'paragraphe':
    case 'note': {
      const taille = b.type === 'note' ? 8.5 : 10.5
      const gras = b.type === 'paragraphe' && Boolean(b.gras)
      for (const l of couper(b.texte, taille, UTILE, gras)) {
        p.place(taille + 6)
        if (l) p.texte(l, MARGE, p.y - taille, taille, gras, b.type === 'note' ? GRIS : TEXTE)
        p.y -= taille + 5
      }
      p.y -= 4
      break
    }
    case 'lignes':
      for (const [libelle, valeur] of b.lignes) {
        p.place(20)
        p.texte(libelle, MARGE, p.y - 11, 10.5)
        p.texte(valeur, L - MARGE - largeur(valeur, 10.5, true), p.y - 11, 10.5, true)
        p.trait(MARGE, p.y - 17, L - MARGE, p.y - 17, LAVANDE)
        p.y -= 22
      }
      break
    case 'total':
      p.place(34)
      p.rect(MARGE, p.y - 28, UTILE, 28, b.accent ? NUIT : LAVANDE)
      p.texte(b.libelle, MARGE + 12, p.y - 18, 11, true, b.accent ? [1, 1, 1] : NUIT)
      p.texte(b.valeur, L - MARGE - 12 - largeur(b.valeur, 12, true), p.y - 18.5, 12, true, b.accent ? [1, 1, 1] : NUIT)
      p.y -= 38
      break
    case 'resume': {
      const n = b.elements.length
      const l = (UTILE - (n - 1) * 8) / n
      p.place(56)
      b.elements.forEach(([libelle, valeur], i) => {
        const x = MARGE + i * (l + 8)
        p.rect(x, p.y - 48, l, 48, LAVANDE)
        p.texte(libelle, x + 10, p.y - 17, 8.5, false, GRIS)
        p.texte(valeur, x + 10, p.y - 36, 13, true, NUIT)
      })
      p.y -= 60
      break
    }
    case 'tableau': {
      const total = b.largeurs.reduce((a, c) => a + c, 0)
      const cols = b.largeurs.map((c) => (c / total) * UTILE)
      const xs = cols.map((_, i) => MARGE + cols.slice(0, i).reduce((a, c) => a + c, 0))
      const entete = () => {
        p.place(24)
        p.rect(MARGE, p.y - 20, UTILE, 20, NUIT)
        b.entetes.forEach((e, i) => {
          const droite = b.droite?.includes(i)
          const x = droite ? xs[i] + cols[i] - 8 - largeur(e, 9, true) : xs[i] + 8
          p.texte(e, x, p.y - 13.5, 9, true, [1, 1, 1])
        })
        p.y -= 20
      }
      entete()
      b.lignes.forEach((ligne, n) => {
        if (p.y - 17 < MARGE + 20) {
          p.nouvelle()
          entete()
        }
        if (n % 2 === 1) p.rect(MARGE, p.y - 17, UTILE, 17, LAVANDE)
        ligne.forEach((v, i) => {
          const droite = b.droite?.includes(i)
          const x = droite ? xs[i] + cols[i] - 8 - largeur(v, 9) : xs[i] + 8
          p.texte(v, x, p.y - 12, 9)
        })
        p.y -= 17
      })
      p.y -= 10
      break
    }
    case 'cases':
      for (const [coche, texte] of b.elements) {
        const lignes = couper(texte, 10.5, UTILE - 26)
        p.place(lignes.length * 15 + 8)
        p.cadre(MARGE, p.y - 13, 12, 12, coche ? VERT : GRIS, 1.2)
        if (coche) {
          p.trait(MARGE + 2.5, p.y - 7, MARGE + 5, p.y - 10.5, VERT, 1.8)
          p.trait(MARGE + 5, p.y - 10.5, MARGE + 10, p.y - 3.5, VERT, 1.8)
        }
        lignes.forEach((l, i) => p.texte(l, MARGE + 22, p.y - 11 - i * 15, 10.5, false, coche ? TEXTE : GRIS))
        p.y -= lignes.length * 15 + 8
      }
      break
    case 'espace':
      p.y -= b.hauteur ?? 12
      break
  }
}

/** Fabrique un PDF (octets) à partir de blocs. */
export function creerPdf(titreDoc: string, blocs: Bloc[]): Uint8Array {
  const p = new Pages(titreDoc)
  for (const b of blocs) dessiner(p, b)
  const flux = p.fin()

  const objets: string[] = []
  const ajouter = (o: string) => objets.push(o) // numéro = index + 1
  ajouter('<< /Type /Catalog /Pages 2 0 R >>')
  ajouter('') // pages, rempli plus bas
  ajouter('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  ajouter('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
  const kids: string[] = []
  for (const f of flux) {
    ajouter(`<< /Length ${f.length} >>\nstream\n${f}endstream`)
    const contenu = objets.length
    ajouter(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${L} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contenu} 0 R >>`,
    )
    kids.push(`${objets.length} 0 R`)
  }
  objets[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`
  ajouter(`<< /Producer (Passerelle) /Title (${versWinAnsi(titreDoc)}) >>`)
  const info = objets.length

  let pdf = '%PDF-1.4\n%âãÏÓ\n'
  const positions: number[] = []
  objets.forEach((o, i) => {
    positions.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`
  for (const pos of positions) pdf += `${String(pos).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Uint8Array.from(pdf, (c) => c.charCodeAt(0) & 0xff)
}
