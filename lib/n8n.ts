// Appels aux adresses n8n de Passerelle (workflows 2 et 4).
// L'adresse et l'étudiant de démo peuvent être changés dans les variables d'environnement Vercel.

export const N8N_URL =
  process.env.NEXT_PUBLIC_N8N_URL ?? 'https://ema999999.app.n8n.cloud/webhook'

// Profil de test enregistré dans Supabase (Lucas Martin, données fictives).
const ETUDIANT_DEMO_ID =
  process.env.NEXT_PUBLIC_ETUDIANT_ID ?? '71795033-8234-4b4d-b659-1f6cba475860'

const CLE_STOCKAGE = 'passerelle_etudiant_id'

/** Identifiant de l'étudiant : celui créé au dépôt des documents s'il existe, sinon le profil de démo. */
export function getEtudiantId(): string {
  if (typeof window !== 'undefined') {
    try {
      const enregistre = window.localStorage.getItem(CLE_STOCKAGE)
      if (enregistre) return enregistre
    } catch {
      // Stockage indisponible : on garde le profil de démo.
    }
  }
  return ETUDIANT_DEMO_ID
}

export function setEtudiantId(id: string): void {
  try {
    window.localStorage.setItem(CLE_STOCKAGE, id)
  } catch {
    // Stockage indisponible : rien à faire.
  }
}

/** Aides de l'interface qui ont une démarche automatisée côté n8n, avec leur code dans Supabase. */
export const CODES_N8N: Record<string, string> = {
  apl: 'apl',
  'prime-activite': 'prime_activite',
  // Tous les prêts passent par l'agent comparateur-pret (une seule démarche).
  'pret-etat': 'pret_garanti',
  'pret-lbp': 'pret_garanti',
  'pret-sg': 'pret_garanti',
  'pret-cic': 'pret_garanti',
  // Démarches guidées pour l'instant (agents de demande pas encore activés).
  visale: 'visale',
  'mobili-jeune': 'mobili_jeune',
}

const BANQUES = ['pret-lbp', 'pret-sg', 'pret-cic']

export interface DemarcheN8n {
  id: string
  aide_code: string
  statut: string
  niveau: string | null
  cochee: boolean | null
  montant_estime: number | string | null
  updated_at: string | null
  resultat_agent: {
    lien_public?: string | null
    lien_session?: string | null
    lien_session_simulateur?: string | null
    etape_bloquante?: string | null
    simulation?: { montant_mensuel?: number | null; remarques?: string } | null
    reponse?: { resultats?: unknown[]; [cle: string]: unknown } | null
  } | null
}

export interface EtatN8n {
  etape?: string
  erreur?: string
  demarches?: DemarcheN8n[]
}

/** Envoie les aides cochées au workflow 2, qui lance les agents H. Renvoie le nombre d'aides envoyées. */
export async function lancerDemarches(selection: Iterable<string>, montantPret?: number): Promise<number> {
  const choisies = [...selection]
  const aides = [...new Set(choisies.map((id) => CODES_N8N[id]).filter(Boolean))]
  if (aides.length === 0) return 0
  const banques = choisies.filter((id) => BANQUES.includes(id))

  const reponse = await fetch(`${N8N_URL}/passerelle/lancer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      etudiant_id: getEtudiantId(),
      aides: aides.join(','),
      banques: banques.join(','),
      montant: montantPret ?? null,
      consentement: 'true',
    }),
  })
  if (!reponse.ok) throw new Error(`Passerelle n'a pas pu lancer les agents (erreur ${reponse.status}).`)
  return aides.length
}

/** Lit l'état de l'étudiant (démarches, statuts, montants) depuis le workflow 4. */
export async function lireEtat(): Promise<EtatN8n> {
  const reponse = await fetch(
    `${N8N_URL}/passerelle/etat?etudiant_id=${encodeURIComponent(getEtudiantId())}`,
    { cache: 'no-store' },
  )
  if (!reponse.ok) throw new Error(`Passerelle ne répond pas (erreur ${reponse.status}).`)
  return reponse.json()
}

export interface DocumentN8n {
  id: string
  type: string
  statut: string
  champs_extraits: Record<string, unknown> | null
  anomalies: { code: string; message: string; gravite: 'bloquante' | 'a_verifier' }[] | null
}

export interface EtatDocumentsN8n extends EtatN8n {
  documents?: DocumentN8n[]
}

/** Envoie les documents au workflow 1 (lecture par Qwen, contrôle croisé, profil). Renvoie l'id du nouvel étudiant. */
export async function deposerDocuments(donnees: FormData): Promise<string> {
  const reponse = await fetch(`${N8N_URL}/passerelle/depot`, { method: 'POST', body: donnees })
  if (!reponse.ok) throw new Error(`Tes documents n'ont pas pu être envoyés (erreur ${reponse.status}).`)
  const json = (await reponse.json()) as { etudiant_id?: string }
  if (!json.etudiant_id) throw new Error("Passerelle n'a pas renvoyé de dossier.")
  setEtudiantId(json.etudiant_id)
  return json.etudiant_id
}

/** Lit l'état d'un étudiant précis (documents lus, anomalies, démarches). */
export async function lireEtatEtudiant(etudiantId: string): Promise<EtatDocumentsN8n> {
  const reponse = await fetch(
    `${N8N_URL}/passerelle/etat?etudiant_id=${encodeURIComponent(etudiantId)}`,
    { cache: 'no-store' },
  )
  if (!reponse.ok) throw new Error(`Passerelle ne répond pas (erreur ${reponse.status}).`)
  return reponse.json()
}
