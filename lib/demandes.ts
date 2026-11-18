// Appels à la fonction Supabase « demande-h », qui pilote les agents H de demande (Visale, Mobili-Jeune).

export const DEMANDE_URL =
  process.env.NEXT_PUBLIC_DEMANDE_URL ?? 'https://hnziztstifpipxrgdnop.supabase.co/functions/v1/demande-h'

export interface EtatDemande {
  statut: string
  message: string | null
  lien: string | null
  etapes: number | null
}

async function appeler<T>(corps: Record<string, unknown>): Promise<T> {
  const r = await fetch(DEMANDE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  })
  const json = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((json as { erreur?: string }).erreur ?? `Erreur ${r.status}`)
  return json as T
}

export function lancerDemande(aide: 'visale' | 'mobili_jeune', etudiantId: string) {
  return appeler<{ session_id: string; lien: string | null }>({ action: 'lancer', aide, etudiant_id: etudiantId })
}

export function lireDemande(sessionId: string) {
  return appeler<EtatDemande>({ action: 'etat', session_id: sessionId })
}

export function repondreDemande(sessionId: string, message: string) {
  return appeler<{ ok: boolean }>({ action: 'repondre', session_id: sessionId, message })
}
