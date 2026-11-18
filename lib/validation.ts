import { etudiants } from '@/lib/data'
import { MONTANT_PAR_DEFAUT } from '@/lib/choix'

export type DemarcheId = 'apl' | 'banque-postale' | 'societe-generale' | 'cic'

export interface DemarcheInfo {
  id: DemarcheId
  nom: string
  /** Organisme à qui s'adresse la démarche. */
  destinataire: string
  /** Nom de domaine affiché à l'étudiant. */
  site: string
  /** Site officiel, ouvert dans un nouvel onglet : l'étudiant s'y connecte et envoie lui-même. */
  url: string
}

export const DEMARCHES: Record<DemarcheId, DemarcheInfo> = {
  apl: {
    id: 'apl',
    nom: 'Simulation APL',
    destinataire: 'CAF',
    site: 'caf.fr',
    url: 'https://www.caf.fr/',
  },
  'banque-postale': {
    id: 'banque-postale',
    nom: 'Prêt étudiant – La Banque Postale',
    destinataire: 'La Banque Postale',
    site: 'labanquepostale.fr',
    url: 'https://www.labanquepostale.fr/',
  },
  'societe-generale': {
    id: 'societe-generale',
    nom: 'Prêt étudiant – Société Générale',
    destinataire: 'Société Générale',
    site: 'particuliers.sg.fr',
    url: 'https://particuliers.sg.fr/',
  },
  cic: {
    id: 'cic',
    nom: 'Prêt étudiant – CIC',
    destinataire: 'CIC',
    site: 'cic.fr',
    url: 'https://www.cic.fr/',
  },
}

export const ETUDIANT = etudiants[0]
export const EMAIL_ETUDIANT = 'lea.martin@exemple.fr'

/* ---------------------------------- APL ---------------------------------- */

export const APL_ESTIMEE = 210

export interface InfoApl {
  id: string
  libelle: string
  valeur: string
}

export const INFOS_APL_INITIALES: InfoApl[] = [
  { id: 'adresse', libelle: 'Adresse du logement', valeur: ETUDIANT.adresse },
  { id: 'loyer', libelle: 'Loyer réel', valeur: '650 € par mois, charges comprises' },
  { id: 'logement', libelle: 'Type de logement', valeur: 'Meublé' },
  { id: 'foyer', libelle: 'Situation', valeur: 'Seule dans le logement' },
  { id: 'salaire', libelle: "Salaire d'alternance", valeur: '1 100 € par mois' },
]

/* ---------------------------------- Prêt --------------------------------- */

export const MONTANT_PRET = MONTANT_PAR_DEFAUT

export interface OffrePret {
  id: Exclude<DemarcheId, 'apl'>
  banque: string
  /** Taux annuel nominal, en pourcentage. */
  taux: number
  /** Durée en mois. */
  duree: number
  mensualite: number
  /** Total remboursé sur toute la durée. */
  coutTotal: number
  interets: number
}

export function calculerMensualite(montant: number, tauxAnnuel: number, duree: number): number {
  const r = tauxAnnuel / 100 / 12
  return (montant * r) / (1 - Math.pow(1 + r, -duree))
}

function construireOffre(
  id: OffrePret['id'],
  banque: string,
  taux: number,
  duree: number,
  montant: number,
): OffrePret {
  const mensualite = calculerMensualite(montant, taux, duree)
  const coutTotal = mensualite * duree
  return { id, banque, taux, duree, mensualite, coutTotal, interets: coutTotal - montant }
}

export const OFFRES_PRET: OffrePret[] = [
  construireOffre('banque-postale', 'La Banque Postale', 3.05, 60, MONTANT_PRET),
  construireOffre('cic', 'CIC', 3.1, 60, MONTANT_PRET),
  construireOffre('societe-generale', 'Société Générale', 3.2, 60, MONTANT_PRET),
]

export const MEILLEURE_OFFRE: OffrePret = OFFRES_PRET.reduce((meilleure, offre) =>
  offre.coutTotal < meilleure.coutTotal ? offre : meilleure,
)

/* ------------------------------ Mise en forme ----------------------------- */

const formatEurosDecimal = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formaterEurosCentimes(montant: number): string {
  return formatEurosDecimal.format(montant)
}

export function formaterTaux(taux: number): string {
  return `${taux.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} %`
}

export function formaterDateHeure(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

/* -------------------------------- Mail récap ------------------------------- */

/** Démarches marquées « Envoyées », avec la date d'envoi au format ISO. */
export type EnvoisParDemarche = Partial<Record<DemarcheId, string>>

export const OBJET_MAIL_RECAP = 'Passerelle – récapitulatif de tes démarches'

export interface LigneRecapMail {
  demarche: string
  destinataire: string
  envoyeeLe: string
}

export interface RecapMail {
  destinataire: string
  objet: string
  envoyees: LigneRecapMail[]
  piecesJointes: string[]
}

export function construireRecapMail(envois: EnvoisParDemarche, piecesJointes: string[]): RecapMail {
  const envoyees = (Object.keys(DEMARCHES) as DemarcheId[])
    .filter((id) => envois[id])
    .map((id) => ({
      demarche: DEMARCHES[id].nom,
      destinataire: DEMARCHES[id].destinataire,
      envoyeeLe: envois[id] as string,
    }))
    .sort((a, b) => a.envoyeeLe.localeCompare(b.envoyeeLe))

  return { destinataire: EMAIL_ETUDIANT, objet: OBJET_MAIL_RECAP, envoyees, piecesJointes }
}

/**
 * Envoie le mail récapitulatif des démarches envoyées par l'étudiant.
 * Simulé pour l'instant : à brancher sur n8n (webhook qui compose et envoie le mail,
 * pièces jointes comprises). Appelée à chaque nouvelle démarche envoyée, avec le récapitulatif
 * complet à ce moment-là : le workflow doit donc mettre à jour ou remplacer le mail précédent.
 */
export async function envoyerMailRecap(recap: RecapMail): Promise<void> {
  if (recap.envoyees.length === 0) throw new Error('Aucune démarche envoyée : rien à récapituler.')
  await new Promise((resolve) => setTimeout(resolve, 700))
}
