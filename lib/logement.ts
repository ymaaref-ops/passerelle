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

/**
 * Secours : quand l'agent liste les logements en texte sans bloc JSON
 * (« 1. Studio 11 m² Paris 11e - 520 € - 240 € d'aide CAF = 280 €/mois - dans ton budget - https://… »).
 */
export function logementsDepuisTexte(texte: string): Logement[] {
  const resultat: Logement[] = []
  for (const ligne of texte.split(/\n+/)) {
    const m = /^\s*(\d+)[.)]\s+(.+)$/.exec(ligne)
    if (!m) continue
    const corps = m[2]
    const url = /https?:\/\/\S+/.exec(corps)?.[0]?.replace(/[).,;]+$/, '')
    if (!url) continue
    const morceaux = corps.replace(url, '').split(/\s+[-–—]\s+/).map((x) => x.trim()).filter(Boolean)
    const montant = (re: RegExp) => {
      const r = re.exec(corps)
      return r ? Number(r[1].replace(/\s/g, '').replace(',', '.')) : null
    }
    const titre = morceaux[0]?.replace(/\*\*/g, '') ?? 'Logement'
    const surface = /(\d+(?:[.,]\d+)?)\s*m(?:²|2)/i.exec(titre)?.[1]
    const cp = /\b(75|69|13|33|31|59|67|44|34|35|06)\d{3}\b/.exec(corps)?.[0]
    const arrondissement = /Paris\s+(\d{1,2})\s*(?:e|er|ème|E)\b/i.exec(corps)
    resultat.push({
      rang: Number(m[1]),
      url,
      titre,
      loyer_charges_comprises: montant(/^[^=]*?(\d[\d\s]*(?:[.,]\d+)?)\s*€(?!\s*d['’]aide)/),
      aide_mensuelle: montant(/(\d[\d\s]*(?:[.,]\d+)?)\s*€\s*d['’]aide/i),
      reste_a_payer: montant(/=\s*(\d[\d\s]*(?:[.,]\d+)?)\s*€/),
      dans_budget: /hors budget/i.test(corps) ? false : /dans ton budget/i.test(corps) ? true : null,
      surface_m2: surface ?? null,
      adresse: cp
        ? `${cp} ${/paris/i.test(corps) ? 'Paris' : ''}`.trim()
        : arrondissement
          ? `750${arrondissement[1].padStart(2, '0')} Paris`
          : null,
    })
  }
  return resultat
}

/** Enlève le gras Markdown (**…**) laissé par l'agent. */
export function sansMarkdown(texte: string): string {
  return texte.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#+\s*/gm, '')
}
