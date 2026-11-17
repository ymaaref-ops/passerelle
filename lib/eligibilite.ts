import { aides, calculerAge, type Aide, type Etudiant } from '@/lib/data'

export type StatutEligibilite = 'droit' | 'peut_etre' | 'non_concerne'

export interface AideEvaluee {
  aide: Aide
  statut: StatutEligibilite
  // Une phrase : pourquoi ce n'est pas certain (peut_etre) ou pourquoi on est hors critères (non_concerne).
  raison: string | null
  // Montants chiffrés servant au bandeau récapitulatif.
  mensuelMax: number
  pretMax: number
}

interface Verdict {
  statut: StatutEligibilite
  raison?: string
  mensuelMax?: number
  pretMax?: number
}

const SEUIL_PRIME_ACTIVITE = 1000

// Règles simplifiées sur des données fictives : chaque aide est évaluée à partir du profil.
function evaluer(aide: Aide, etudiant: Etudiant): Verdict {
  const age = calculerAge(etudiant.date_naissance)
  const aUnLoyer = etudiant.loyer > 0

  switch (aide.id) {
    case 'apl':
      return aUnLoyer
        ? { statut: 'droit', mensuelMax: 230 }
        : { statut: 'non_concerne', raison: "Tu n'as pas de loyer à ton nom." }

    case 'prime-activite':
      return age >= 18 && etudiant.salaire_alternance >= SEUIL_PRIME_ACTIVITE
        ? { statut: 'droit', mensuelMax: 150 }
        : { statut: 'non_concerne', raison: 'Ton salaire est sous le seuil de 1 000 € net par mois.' }

    case 'pret-lbp':
    case 'pret-sg':
    case 'pret-cic':
      return age <= 28
        ? { statut: 'droit', pretMax: aide.id === 'pret-cic' ? 20000 : 15000 }
        : { statut: 'non_concerne', raison: 'Tu dépasses la limite de 28 ans.' }

    case 'bourse-crous':
      // Plafond en 12 mensualités : 6 335 € / an.
      return { statut: 'droit', mensuelMax: Math.round(6335 / 12) }

    case 'pret-etat':
      return {
        statut: 'peut_etre',
        raison: "Dépend de ta nationalité et de l'accord d'une banque partenaire.",
        pretMax: 20000,
      }

    case 'mobili-jeune':
      return {
        statut: 'peut_etre',
        raison: "Dépend du secteur de ton entreprise d'alternance (privé non agricole).",
      }

    case 'visale':
      return {
        statut: 'peut_etre',
        raison: 'Utile seulement si tu signes un nouveau bail avec un propriétaire.',
      }

    case 'loca-pass':
      return {
        statut: 'peut_etre',
        raison: 'Utile seulement si tu emménages dans un nouveau logement dans les 2 mois.',
      }

    case 'aide-mobilite':
      return {
        statut: 'non_concerne',
        raison: 'Réservée aux boursiers qui passent de licence en master dans une autre région.',
      }

    case 'aide-urgence-crous':
      return {
        statut: 'non_concerne',
        raison: "Pensée pour une difficulté financière soudaine, ce qui n'est pas ton cas aujourd'hui.",
      }

    default:
      return { statut: 'non_concerne' }
  }
}

export interface AidesTriees {
  droit: AideEvaluee[]
  peutEtre: AideEvaluee[]
  nonConcerne: AideEvaluee[]
  totalMensuel: number
  pretMaximum: number
}

export function trierAides(etudiant: Etudiant): AidesTriees {
  const evaluees: AideEvaluee[] = aides.map((aide) => {
    const verdict = evaluer(aide, etudiant)
    return {
      aide,
      statut: verdict.statut,
      raison: verdict.raison ?? null,
      mensuelMax: verdict.mensuelMax ?? 0,
      pretMax: verdict.pretMax ?? 0,
    }
  })

  const droit = evaluees.filter((a) => a.statut === 'droit')

  return {
    droit,
    peutEtre: evaluees.filter((a) => a.statut === 'peut_etre'),
    nonConcerne: evaluees.filter((a) => a.statut === 'non_concerne'),
    totalMensuel: droit.reduce((somme, a) => somme + a.mensuelMax, 0),
    pretMaximum: droit.reduce((max, a) => Math.max(max, a.pretMax), 0),
  }
}

const formatEuros = new Intl.NumberFormat('fr-FR')

export function formaterEuros(montant: number): string {
  return `${formatEuros.format(montant)} €`
}

export function formaterDate(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date))
}

// Garde la première phrase pour que chaque carte reste lisible d'un coup d'œil.
export function premierePhrase(texte: string): string {
  const fin = texte.search(/[.!?](\s|$)/)
  return fin === -1 ? texte : texte.slice(0, fin + 1)
}
