// Vraie demande d'APL préparée par l'agent H « demande-apl-caf » (espace de Margot), via le workflow n8n 6.
// L'agent se connecte au compte CAF rangé dans le coffre H, remplit la demande et s'arrête au récapitulatif :
// il ne clique jamais sur l'envoi final. n8n n'accepte que le dossier relié à ce compte CAF.
import { N8N_URL } from './n8n'

async function appeler<T>(corps: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${N8N_URL}/passerelle/demande-caf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  })
  const json = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((json as { erreur?: string }).erreur ?? `Erreur ${r.status}`)
  return json as T
}

export function lancerDemandeCaf(etudiantId: string) {
  return appeler<{ session_id: string; lien: string | null }>({ action: 'lancer', etudiant_id: etudiantId, consentement: true })
}

export function repondreDemandeCaf(etudiantId: string, sessionId: string, message: string) {
  return appeler<{ ok: boolean }>({ action: 'repondre', etudiant_id: etudiantId, session_id: sessionId, message })
}

export function refuserDemandeCaf(etudiantId: string) {
  return appeler<{ ok: boolean }>({ action: 'refuser', etudiant_id: etudiantId })
}

/** Seul ce compte Passerelle est relié à un compte CAF dans le coffre H. */
export const COMPTE_DEMANDE_CAF = 'margotfrappa1@gmail.com'
