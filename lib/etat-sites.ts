import type { AgentId } from '@/lib/agents'

// État des sites utilisés par les agents (fonction Supabase « sites », vérifiée toutes les 15 min).

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

/** Sites dont dépend chaque agent. */
export const SITES_PAR_AGENT: Record<AgentId, string[]> = {
  apl: ['caf'],
  'prime-activite': ['caf'],
  bourse: ['crous'],
  visale: ['visale'],
  'mobili-jeune': ['action_logement'],
  prets: ['labanquepostale', 'societegenerale', 'cic'],
}

/** Sites utilisés par la recherche de logement (annonces + simulateur CAF). */
export const SITES_LOGEMENT = ['pap', 'caf']

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
