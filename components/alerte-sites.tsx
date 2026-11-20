'use client'

import useSWR from 'swr'
import { Construction, WifiOff } from 'lucide-react'
import { lireEtatSites, sitesEnProbleme, type EtatSite } from '@/lib/etat-sites'
import { cn } from '@/lib/utils'

function depuis(iso: string | null): string | null {
  if (!iso) return null
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `depuis ${minutes} min`
  const heures = Math.round(minutes / 60)
  return heures < 24 ? `depuis ${heures} h` : `depuis ${Math.round(heures / 24)} j`
}

/** Les sites (tous, ou ceux de la liste) en maintenance ou en panne. Partagé entre les pages. */
export function useSitesEnProbleme(seulement?: string[]): EtatSite[] {
  const { data } = useSWR('etat-sites', lireEtatSites, { refreshInterval: 5 * 60_000, revalidateOnFocus: true })
  return sitesEnProbleme(data ?? [], seulement)
}

/**
 * Bandeau d'alerte quand un site utilisé par les agents est en maintenance ou ne répond pas.
 * `consequence` : phrase ajoutée à la fin (« L'agent attendra qu'il revienne », etc.).
 */
export function AlerteSites({
  seulement,
  consequence = "Les agents qui l'utilisent risquent d'échouer : relance-les quand le site sera revenu.",
  className,
}: {
  seulement?: string[]
  consequence?: string
  className?: string
}) {
  const problemes = useSitesEnProbleme(seulement)
  if (!problemes.length) return null
  return (
    <div
      role="status"
      className={cn('flex flex-col gap-3 rounded-3xl border border-step-orange-border bg-step-orange-soft p-5', className)}
    >
      {problemes.map((s) => {
        const panne = s.statut === 'indisponible'
        const Icone = panne ? WifiOff : Construction
        return (
          <div key={s.site} className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-step-orange text-white">
              <Icone className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-foreground">
                {s.nom} {panne ? 'ne répond pas' : 'est en maintenance'}
                {depuis(s.depuis) && <span className="font-normal text-muted-foreground"> · {depuis(s.depuis)}</span>}
              </p>
              {s.detail && <p className="text-sm text-muted-foreground">{s.detail}</p>}
            </div>
          </div>
        )
      })}
      <p className="text-sm text-foreground">{consequence}</p>
    </div>
  )
}
