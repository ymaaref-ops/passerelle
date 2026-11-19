// Appels à la fonction Supabase « logement-h », qui pilote l'agent H passerelle-logement (Lamyaa).

export const LOGEMENT_URL =
  process.env.NEXT_PUBLIC_LOGEMENT_URL ?? 'https://hnziztstifpipxrgdnop.supabase.co/functions/v1/logement-h'

export interface DemandeLogement {
  ville: string
  budget: number
  type: string
  meuble: string
  date_entree: string
  age?: number | null
  boursier?: string
  revenus?: number | null
  liens?: string[]
}

export interface Logement {
  rang?: number
  url?: string
  titre?: string
  loyer_charges_comprises?: number | null
  aide_mensuelle?: number | null
  reste_a_payer?: number | null
  dans_budget?: boolean | null
  eligibilite?: 'eligible' | 'a_verifier' | 'non_eligible' | 'deja_loue' | string
  raisons?: string | string[] | null
  alertes?: string | string[] | null
  // Champs demandés en plus pour les cartes (null si l'annonce ne le dit pas).
  photo?: string | null
  adresse?: string | null
  surface_m2?: number | string | null
  pieces?: number | string | null
  meuble?: string | boolean | null
  disponible_le?: string | null
  site?: string | null
  description?: string | null
  equipements?: string | string[] | null
}

export interface EtatRecherche {
  statut: string
  reponse: unknown
  logements: Logement[] | null
  etapes: number | null
  lien: string | null
}

async function appeler<T>(corps: Record<string, unknown>): Promise<T> {
  const r = await fetch(LOGEMENT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  })
  const json = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((json as { erreur?: string }).erreur ?? `Erreur ${r.status}`)
  return json as T
}

export function lancerRecherche(demande: DemandeLogement, etudiantId?: string | null) {
  return appeler<{ session_id: string; lien: string | null }>({ action: 'lancer', demande, etudiant_id: etudiantId ?? null })
}

export function lireRecherche(sessionId: string) {
  return appeler<EtatRecherche>({ action: 'etat', session_id: sessionId })
}

export function repondreAgent(sessionId: string, message: string) {
  return appeler<{ ok: boolean }>({ action: 'repondre', session_id: sessionId, message })
}

/** Texte lisible de la réponse de l'agent (sans le bloc JSON). */
export function texteReponse(reponse: unknown): string {
  if (reponse == null) return ''
  if (typeof reponse === 'string') return reponse.replace(/```(?:json)?[\s\S]*?```/g, '').trim()
  if (typeof reponse === 'object' && 'content' in (reponse as object)) {
    return texteReponse((reponse as { content: unknown }).content)
  }
  return ''
}
