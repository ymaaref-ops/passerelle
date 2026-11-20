// Petit générateur de PDF sans bibliothèque (A4, Helvetica), pour les documents de Passerelle :
// titres, paragraphes, lignes « libellé … montant », tableaux, cases à cocher, sur plusieurs pages.

export type Bloc =
  | { type: 'titre'; texte: string }
  | { type: 'sousTitre'; texte: string }
  | { type: 'paragraphe'; texte: string; gras?: boolean; droite?: boolean }
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

// Couleurs du logo Passerelle (pont) : bleu nuit #18205e et vert #5ee5a0.
const NUIT: [number, number, number] = [0.094, 0.125, 0.369]
const VERT_LOGO: [number, number, number] = [0.369, 0.898, 0.627]
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

export interface OptionsPdf {
  /** « document » : en-tête Passerelle complet ; « lettre » : papier à lettre de l'étudiant, discret. */
  style?: 'document' | 'lettre'
  beneficiaire?: { nom: string; email?: string | null }
  reference?: string
  date?: string
}

const K = 0.5523 // approximation d'un quart d'ellipse par une courbe de Bézier

class Pages {
  pages: string[] = []
  flux = ''
  y = H - MARGE

  constructor(
    private titreDoc: string,
    private options: OptionsPdf,
  ) {
    this.nouvelle()
  }

  /** Logo Passerelle (pont sur fond bleu nuit), dessiné en vectoriel. x, y : coin bas gauche. */
  logo(x: number, y: number, taille: number) {
    const s = taille / 1024
    const X = (v: number) => (x + v * s).toFixed(2)
    const Y = (v: number) => (y + taille - v * s).toFixed(2)
    const r = 230
    // Carré arrondi
    this.flux += `${rgb(NUIT)} rg ${X(r)} ${Y(0)} m ${X(1024 - r)} ${Y(0)} l `
    this.flux += `${X(1024 - r + r * K)} ${Y(0)} ${X(1024)} ${Y(r - r * K)} ${X(1024)} ${Y(r)} c ${X(1024)} ${Y(1024 - r)} l `
    this.flux += `${X(1024)} ${Y(1024 - r + r * K)} ${X(1024 - r + r * K)} ${Y(1024)} ${X(1024 - r)} ${Y(1024)} c ${X(r)} ${Y(1024)} l `
    this.flux += `${X(r - r * K)} ${Y(1024)} ${X(0)} ${Y(1024 - r + r * K)} ${X(0)} ${Y(1024 - r)} c ${X(0)} ${Y(r)} l `
    this.flux += `${X(0)} ${Y(r - r * K)} ${X(r - r * K)} ${Y(0)} ${X(r)} ${Y(0)} c f\n`
    // Tablier et suspentes (blanc), arche (vert)
    this.flux += `1 J 1 1 1 RG ${(56 * s).toFixed(2)} w ${X(250)} ${Y(606)} m ${X(772)} ${Y(606)} l S\n`
    this.flux += `${(34 * s).toFixed(2)} w ${X(398)} ${Y(505)} m ${X(398)} ${Y(590)} l S ${X(512)} ${Y(465)} m ${X(512)} ${Y(590)} l S ${X(625)} ${Y(505)} m ${X(625)} ${Y(590)} l S\n`
    const rx = 204
    const ry = 163
    this.flux += `${rgb(VERT_LOGO)} RG ${(56 * s).toFixed(2)} w ${X(308)} ${Y(606)} m `
    this.flux += `${X(308)} ${Y(606 - ry * K)} ${X(512 - rx * K)} ${Y(443)} ${X(512)} ${Y(443)} c `
    this.flux += `${X(512 + rx * K)} ${Y(443)} ${X(716)} ${Y(606 - ry * K)} ${X(716)} ${Y(606)} c S 0 J\n`
  }

  nouvelle() {
    if (this.flux) this.pages.push(this.flux)
    this.flux = ''
    const premiere = this.pages.length === 0
    const { style = 'document', beneficiaire, reference, date } = this.options

    if (style === 'lettre') {
      this.y = H - MARGE - 10
      return
    }

    if (premiere) {
      // En-tête complet : logo, marque, référence et date
      const haut = H - 42
      this.logo(MARGE, haut - 38, 38)
      this.texte('Passerelle', MARGE + 48, haut - 17, 17, true, NUIT)
      this.texte('Tes aides étudiantes, sans paperasse', MARGE + 48, haut - 31, 8.5, false, GRIS)
      const lignesDroite = [
        [this.titreDoc.toUpperCase(), true],
        [reference ? `Réf. ${reference}` : '', false],
        [date ? `Établi le ${date}` : '', false],
      ] as const
      lignesDroite.forEach(([t, gras], i) => {
        if (t) this.texte(t, L - MARGE - largeur(t, gras ? 8.5 : 8.5, gras), haut - 12 - i * 12, 8.5, gras, gras ? NUIT : GRIS)
      })
      // Filet bleu nuit avec une touche de vert
      this.rect(MARGE, haut - 52, UTILE, 1.6, NUIT)
      this.rect(MARGE, haut - 52, 60, 1.6, VERT_LOGO)
      this.y = haut - 70
      // Bloc d'identification
      if (beneficiaire) {
        this.rect(MARGE, this.y - 44, UTILE, 44, LAVANDE)
        this.rect(MARGE, this.y - 44, 3, 44, NUIT)
        this.texte('ÉTABLI POUR', MARGE + 14, this.y - 15, 7.5, true, GRIS)
        this.texte(beneficiaire.nom, MARGE + 14, this.y - 31, 11.5, true, NUIT)
        if (beneficiaire.email) {
          const e = beneficiaire.email
          this.texte('CONTACT', L - MARGE - 14 - Math.max(largeur(e, 9.5), largeur('CONTACT', 7.5, true)), this.y - 15, 7.5, true, GRIS)
          this.texte(e, L - MARGE - 14 - Math.max(largeur(e, 9.5), largeur('CONTACT', 7.5, true)), this.y - 31, 9.5, false, TEXTE)
        }
        this.y -= 62
      }
    } else {
      // Pages suivantes : en-tête réduit
      this.logo(MARGE, H - 44, 18)
      this.texte('Passerelle', MARGE + 25, H - 38, 10, true, NUIT)
      const t = this.titreDoc
      this.texte(t, L - MARGE - largeur(t, 8.5), H - 38, 8.5, false, GRIS)
      this.rect(MARGE, H - 52, UTILE, 0.8, LAVANDE_FONCE)
      this.y = H - 70
    }
  }

  place(hauteur: number) {
    if (this.y - hauteur < MARGE + 30) this.nouvelle()
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
    const lettre = this.options.style === 'lettre'
    return this.pages.map((p, i) => {
      let pied = ''
      const n = `${i + 1} / ${this.pages.length}`
      if (lettre) {
        const t = 'Lettre préparée avec Passerelle'
        pied += `BT ${rgb(GRIS)} rg /F1 7.5 Tf ${(L / 2 - largeur(t, 7.5) / 2).toFixed(2)} 30 Td (${versWinAnsi(t)}) Tj ET\n`
      } else {
        pied += `${rgb(LAVANDE_FONCE)} RG 0.8 w ${MARGE} 48 m ${L - MARGE} 48 l S\n`
        const g1 = 'Passerelle · team1@eugeniaschool.com'
        const g2 = 'Estimation indicative établie à partir de tes documents, sans valeur contractuelle.'
        pied += `BT ${rgb(NUIT)} rg /F2 7.5 Tf ${MARGE} 36 Td (${versWinAnsi(g1)}) Tj ET\n`
        pied += `BT ${rgb(GRIS)} rg /F1 7 Tf ${MARGE} 26 Td (${versWinAnsi(g2)}) Tj ET\n`
        pied += `BT ${rgb(GRIS)} rg /F1 7.5 Tf ${(L - MARGE - largeur(n, 7.5)).toFixed(2)} 36 Td (${versWinAnsi(n)}) Tj ET\n`
      }
      return p + pied
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
        const x = b.type === 'paragraphe' && b.droite ? L - MARGE - largeur(l, taille, gras) : MARGE
        if (l) p.texte(l, x, p.y - taille, taille, gras, b.type === 'note' ? GRIS : TEXTE)
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
        if (p.y - 15 < MARGE + 30) {
          p.nouvelle()
          entete()
        }
        if (n % 2 === 1) p.rect(MARGE, p.y - 15, UTILE, 15, LAVANDE)
        ligne.forEach((v, i) => {
          const droite = b.droite?.includes(i)
          const x = droite ? xs[i] + cols[i] - 8 - largeur(v, 8.8) : xs[i] + 8
          p.texte(v, x, p.y - 10.8, 8.8)
        })
        p.y -= 15
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
export function creerPdf(titreDoc: string, blocs: Bloc[], options: OptionsPdf = {}): Uint8Array {
  const p = new Pages(titreDoc, options)
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
