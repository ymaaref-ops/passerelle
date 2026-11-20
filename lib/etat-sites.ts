import type { AgentId } from '@/lib/agents'

// État de la CAF et des banques utilisées (fonction Supabase « sites », vérifiée toutes les 15 min).

const URL_SITES =
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://hnziztstifpipxrgdnop.supabase.co') + '/functions/v1/sites'

export type StatutSite = 'ok' | 'lent' | 'maintenance' | 'indisponible' | 'inconnu'

export interface EtatSite {
  site: string
  nom: string
  url: string
  statut: StatutSite
  detail: string | null
  verifie_le: string | null
  depuis: string | null
}

/** Sites surveillés : seulement la CAF et les banques du comparateur de prêts. */
export const SITES_PAR_AGENT: Record<AgentId, string[]> = {
  apl: ['caf'],
  'prime-activite': ['caf'],
  bourse: [],
  visale: [],
  'mobili-jeune': [],
  prets: ['labanquepostale', 'societegenerale', 'cic'],
}

/** La recherche de logement utilise le simulateur de la CAF. */
export const SITES_LOGEMENT = ['caf']

export async function lireEtatSites(): Promise<EtatSite[]> {
  const r = await fetch(URL_SITES, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'lire' }),
  })
  if (!r.ok) throw new Error(`sites ${r.status}`)
  const j = (await r.json()) as { sites?: EtatSite[] }
  return j.sites ?? []
}

/** Sites qui posent problème (maintenance ou panne), éventuellement limités à une liste. */
export function sitesEnProbleme(sites: EtatSite[], seulement?: string[]): EtatSite[] {
  return sites.filter(
    (s) => (s.statut === 'maintenance' || s.statut === 'indisponible') && (!seulement || seulement.includes(s.site)),
  )
}

/** Vrai si un texte d'agent signale une maintenance. */
export function texteMaintenance(texte: string | null | undefined): boolean {
  return /SITE_EN_MAINTENANCE|site en maintenance|en cours de maintenance|maintenance en cours/i.test(texte ?? '')
}
