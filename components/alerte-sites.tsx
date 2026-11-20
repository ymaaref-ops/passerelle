'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { Construction, Loader2, RefreshCw, WifiOff } from 'lucide-react'
import { lireEtatSites, reverifierSites, sitesEnProbleme, type EtatSite } from '@/lib/etat-sites'
import { cn } from '@/lib/utils'

const INTERVALLE_SERVEUR = 15 * 60_000
const DELAI_MIN_REVERIFICATION = 5 * 60_000

function duree(iso: string | null, maintenant: number): string | null {
  if (!iso) return null
  const minutes = Math.max(0, Math.round((maintenant - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `${minutes} min`
  const heures = Math.floor(minutes / 60)
  const reste = minutes % 60
  return heures < 24 ? `${heures} h${reste ? ` ${String(reste).padStart(2, '0')}` : ''}` : `${Math.round(heures / 24)} j`
}

const heure = (t: number) => {
  const d = new Date(t)
  return `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`
}

/** Tous les sites surveillés (partagé entre les pages, relu toutes les minutes). */
function useEtatSites() {
  return useSWR('etat-sites', lireEtatSites, { refreshInterval: 60_000, revalidateOnFocus: true })
}

/** Les sites (tous, ou ceux de la liste) en maintenance ou en panne. */
export function useSitesEnProbleme(seulement?: string[]): EtatSite[] {
  const { data } = useEtatSites()
  return sitesEnProbleme(data ?? [], seulement)
}

/** Heure actuelle, mise à jour toutes les 30 s (pour « depuis 50 min », « il y a 3 min »). */
function useMaintenant() {
  const [t, setT] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setT(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  return t
}

/**
 * Bandeau d'alerte quand la CAF ou une banque utilisée est en maintenance ou ne répond pas,
 * avec l'heure de la dernière vérification, la prochaine, et un bouton pour revérifier.
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
  const { data, mutate } = useEtatSites()
  const maintenant = useMaintenant()
  const [verification, setVerification] = useState(false)
  const problemes = sitesEnProbleme(data ?? [], seulement)
  if (!problemes.length) return null

  const derniere = Math.max(...problemes.map((s) => (s.verifie_le ? new Date(s.verifie_le).getTime() : 0)))
  // Le contrôle automatique tourne à :00, :15, :30 et :45.
  const prochaine = Math.ceil((maintenant + 1) / INTERVALLE_SERVEUR) * INTERVALLE_SERVEUR
  const peutReverifier = maintenant - derniere >= DELAI_MIN_REVERIFICATION

  async function reverifier() {
    setVerification(true)
    try {
      await mutate(reverifierSites(), { revalidate: false })
    } catch {
      await mutate()
    } finally {
      setVerification(false)
    }
  }

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
                {duree(s.depuis, maintenant) && (
                  <span className="font-normal text-muted-foreground"> · depuis {duree(s.depuis, maintenant)}</span>
                )}
              </p>
              {s.detail && <p className="text-sm text-muted-foreground">{s.detail}</p>}
            </div>
          </div>
        )
      })}
      <p className="text-sm text-foreground">{consequence}</p>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-step-orange-border pt-3 text-sm text-muted-foreground">
        <p>
          {verification ? (
            'Vérification en cours…'
          ) : (
            <>
              Dernière vérification : <span className="font-semibold text-foreground">{heure(derniere)}</span> (il y a{' '}
              {duree(new Date(derniere).toISOString(), maintenant)?.replace("à l'instant", 'moins d’une minute')}) ·
              prochaine vers <span className="font-semibold text-foreground">{heure(prochaine)}</span>. L&apos;alerte
              disparaît d&apos;elle-même quand le site revient.
            </>
          )}
        </p>
        <button
          type="button"
          onClick={reverifier}
          disabled={!peutReverifier || verification}
          title={peutReverifier ? undefined : 'Déjà vérifié il y a moins de 5 minutes'}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-card px-4 font-semibold text-foreground shadow-sm outline-none hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {verification ? (
            <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="size-4" aria-hidden="true" />
          )}
          Revérifier maintenant
        </button>
      </div>
    </div>
  )
}
