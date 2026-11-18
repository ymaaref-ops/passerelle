import type { Aide } from '@/lib/data'
import { formaterEuros } from '@/lib/eligibilite'

export const MONTANT_MIN = 1000
export const MONTANT_MAX = 15000
export const MONTANT_PAR_DEFAUT = 8000
export const MONTANT_PAS = 500

// Rien n'est coché par défaut : c'est l'étudiant qui choisit lui-même ses aides.
export const SELECTION_PAR_DEFAUT: string[] = []

export function estUnPret(aide: Aide): boolean {
  return aide.id.startsWith('pret-')
}

export function borner(montant: number): number {
  return Math.min(MONTANT_MAX, Math.max(MONTANT_MIN, Math.round(montant)))
}

function listeFrancaise(elements: string[]): string {
  if (elements.length <= 1) return elements.join('')
  return `${elements.slice(0, -1).join(', ')} et ${elements[elements.length - 1]}`
}

const BANQUES = [
  { id: 'pret-lbp', nom: 'La Banque Postale' },
  { id: 'pret-sg', nom: 'Société Générale' },
  { id: 'pret-cic', nom: 'CIC' },
]

export interface LigneRecap {
  id: string
  texte: string
  // Montant à mettre en avant à la fin de la ligne (prêts uniquement).
  montant?: string
}

export interface Recapitulatif {
  lignes: LigneRecap[]
  agents: number
}

// Un agent travaille pour chaque aide « automatisée » cochée ; les autres sont guidées pas à pas.
export function construireRecapitulatif(
  selection: ReadonlySet<string>,
  aides: Aide[],
  montantPret: number,
): Recapitulatif {
  const lignes: LigneRecap[] = []
  let agents = 0
  const montant = formaterEuros(montantPret)

  if (selection.has('apl')) {
    lignes.push({ id: 'apl', texte: 'simuler ton APL sur caf.fr' })
    agents += 1
  }

  if (selection.has('prime-activite')) {
    lignes.push({ id: 'prime-activite', texte: "simuler ta prime d'activité sur caf.fr" })
    agents += 1
  }

  // Un seul agent compare toutes les banques cochées (et le prêt garanti par l'État).
  const banques = BANQUES.filter((b) => selection.has(b.id))
  if (banques.length > 0 || selection.has('pret-etat')) {
    const noms = banques.length > 0 ? banques.map((b) => b.nom) : BANQUES.map((b) => b.nom)
    lignes.push({
      id: 'prets',
      texte: `comparer les offres de prêt chez ${listeFrancaise(noms)} pour`,
      montant,
    })
    agents += 1
  }

  const guidees = aides.filter(
    (a) => selection.has(a.id) && !estUnPret(a) && a.niveau !== 'automatisee',
  )
  if (guidees.length > 0) {
    lignes.push({
      id: 'guidees',
      texte: `te guider pas à pas pour : ${listeFrancaise(guidees.map((a) => a.nom))}`,
    })
  }

  return { lignes, agents }
}

export function phraseAgents(agents: number): string {
  if (agents === 0) return "Aucun agent n'est nécessaire pour l'instant"
  if (agents === 1) return '1 agent va travailler pour toi'
  return `${agents} agents vont travailler en parallèle pour toi`
}
