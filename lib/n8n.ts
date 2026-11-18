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
  'pret-etat': 'pret_garanti',
}

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
  } | null
}

export interface EtatN8n {
  etape?: string
  erreur?: string
  demarches?: DemarcheN8n[]
}

/** Envoie les aides cochées au workflow 2, qui lance les agents H. Renvoie le nombre d'aides envoyées. */
export async function lancerDemarches(selection: Iterable<string>): Promise<number> {
  const aides = [...selection].map((id) => CODES_N8N[id]).filter(Boolean)
  if (aides.length === 0) return 0

  const reponse = await fetch(`${N8N_URL}/passerelle/lancer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ etudiant_id: getEtudiantId(), aides: aides.join(','), consentement: 'true' }),
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
