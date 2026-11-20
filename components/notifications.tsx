'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, CircleAlert, CircleCheck, Construction, FileText, Send, type LucideIcon } from 'lucide-react'
import { useSession } from '@/components/compte/menu-compte'
import { getStatutsAgents, type AgentStatut } from '@/lib/agents'
import { lireMonCompte, type MonCompte } from '@/lib/compte'
import { cn } from '@/lib/utils'
import { lireEtatSites, sitesEnProbleme, type EtatSite } from '@/lib/etat-sites'

interface Notification {
  /** Change quand l'état change : une nouvelle étape refait apparaître la pastille. */
  id: string
  titre: string
  texte?: string
  href: string
  date?: string
  type: 'succes' | 'alerte' | 'info'
  Icone: LucideIcon
}

const INTERVALLE = 30_000

function construire(compte: MonCompte | null, agents: AgentStatut[], sites: EtatSite[] = []): Notification[] {
  const liste: Notification[] = []

  for (const site of sitesEnProbleme(sites)) {
    liste.push({
      id: `site-${site.site}-${site.statut}-${site.depuis ?? ''}`,
      titre: `${site.nom} ${site.statut === 'indisponible' ? 'ne répond pas' : 'est en maintenance'}`,
      texte: "Les agents qui l'utilisent risquent de s'arrêter : relance-les quand il sera revenu.",
      href: '/agents',
      date: site.depuis ?? undefined,
      type: 'alerte',
      Icone: Construction,
    })
  }

  const documents = compte?.documents ?? []
  if (documents.length) {
    const date = documents.map((d) => d.created_at).filter(Boolean).sort().pop()
    const aCorriger = documents.flatMap((d) => (d.anomalies ?? []).filter((a) => a.gravite === 'bloquante')).length
    liste.push(
      aCorriger
        ? {
            id: `docs-corriger-${date}-${aCorriger}`,
            titre: `${aCorriger} point${aCorriger > 1 ? 's' : ''} à corriger dans tes documents`,
            texte: 'Ouvre tes documents pour voir quoi corriger.',
            href: '/documents',
            date,
            type: 'alerte',
            Icone: CircleAlert,
          }
        : {
            id: `docs-ok-${date}`,
            titre: 'Tes documents sont validés',
            texte: 'Aucune anomalie détectée. Tu peux voir tes aides.',
            href: '/aides',
            date,
            type: 'succes',
            Icone: FileText,
          },
    )
  }

  for (const a of agents) {
    if (a.bientot && a.statut === 'attente') continue
    if (a.statut === 'besoin') {
      liste.push({
        id: `${a.id}-besoin-${a.majLe ?? ''}`,
        titre: `${a.nom} : l'agent a besoin de toi`,
        texte: a.resultat ?? a.etape,
        href: '/agents',
        date: a.majLe,
        type: 'alerte',
        Icone: CircleAlert,
      })
    } else if (a.statut === 'termine' && a.interrompu) {
      liste.push({
        id: `${a.id}-interrompu-${a.majLe ?? ''}`,
        titre: a.maintenance ? `${a.nom} : site en maintenance` : `${a.nom} : à finir`,
        texte: `L'agent s'est arrêté à : ${a.resultat ?? ''}`,
        href: '/agents',
        date: a.majLe,
        type: 'alerte',
        Icone: CircleAlert,
      })
    } else if (a.statut === 'termine' && a.envoyee) {
      liste.push({
        id: `${a.id}-envoyee-${a.majLe ?? ''}`,
        titre: `${a.nom} : demande envoyée`,
        href: '/agents',
        date: a.majLe,
        type: 'succes',
        Icone: Send,
      })
    } else if (a.statut === 'termine') {
      liste.push({
        id: `${a.id}-termine-${a.majLe ?? ''}`,
        titre: `${a.nom} : simulation terminée`,
        texte: a.resultat ? `${a.resultat}. Relis-la avant de valider.` : 'Relis le résultat avant de valider.',
        href: '/validation',
        date: a.majLe,
        type: 'succes',
        Icone: CircleCheck,
      })
    }
  }

  return liste.sort((x, y) => String(y.date ?? '').localeCompare(String(x.date ?? '')))
}

function quand(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const heure = `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`
  const jour = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const ecart = Math.round((jour(new Date()) - jour(d)) / 86_400_000)
  if (ecart === 0) return `Aujourd'hui · ${heure}`
  if (ecart === 1) return `Hier · ${heure}`
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${heure}`
}

const COULEUR: Record<Notification['type'], string> = {
  succes: 'bg-success-soft text-success',
  alerte: 'bg-step-orange-soft text-step-orange',
  info: 'bg-primary-soft text-step-blue',
}

/** Cloche : la liste des nouveautés (documents, simulations terminées, agents qui ont besoin de toi). */
export function Notifications() {
  const session = useSession()
  const [liste, setListe] = useState<Notification[]>([])
  const [vues, setVues] = useState<Set<string>>(new Set())
  const [ouvert, setOuvert] = useState(false)
  const zone = useRef<HTMLDivElement>(null)
  const cleVues = session ? `passerelle_notifs_vues_${session.email}` : null

  useEffect(() => {
    if (!cleVues) return
    try {
      setVues(new Set(JSON.parse(window.localStorage.getItem(cleVues) ?? '[]') as string[]))
    } catch {
      setVues(new Set())
    }
  }, [cleVues])

  const charger = useCallback(async () => {
    if (!session) return
    const [compte, agents, sites] = await Promise.all([
      lireMonCompte().catch(() => null),
      getStatutsAgents().catch(() => [] as AgentStatut[]),
      lireEtatSites().catch(() => [] as EtatSite[]),
    ])
    setListe(construire(compte, agents, sites))
  }, [session])

  useEffect(() => {
    void charger()
    const id = window.setInterval(() => {
      if (!document.hidden) void charger()
    }, INTERVALLE)
    return () => window.clearInterval(id)
  }, [charger])

  // Fermeture au clic à côté ou avec Échap.
  useEffect(() => {
    if (!ouvert) return
    const fermer = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !zone.current?.contains(e.target as Node)) setOuvert(false)
    }
    document.addEventListener('mousedown', fermer)
    document.addEventListener('keydown', fermer)
    return () => {
      document.removeEventListener('mousedown', fermer)
      document.removeEventListener('keydown', fermer)
    }
  }, [ouvert])

  const nonLues = liste.filter((n) => !vues.has(n.id)).length

  function basculer() {
    const suite = !ouvert
    setOuvert(suite)
    if (suite) void charger()
    // À la fermeture, tout ce qui a été affiché compte comme lu.
    if (!suite && cleVues) marquerLues()
  }

  function marquerLues() {
    if (!cleVues) return
    const toutes = new Set([...vues, ...liste.map((n) => n.id)])
    setVues(toutes)
    try {
      window.localStorage.setItem(cleVues, JSON.stringify([...toutes].slice(-200)))
    } catch {
      // Stockage indisponible.
    }
  }

  if (!session) return null

  return (
    <div ref={zone} className="relative">
      <button
        type="button"
        onClick={basculer}
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        aria-label={nonLues ? `Notifications : ${nonLues} nouvelle${nonLues > 1 ? 's' : ''}` : 'Notifications'}
        className="relative flex size-11 items-center justify-center rounded-full text-foreground outline-none hover:bg-card/70 focus-visible:ring-4 focus-visible:ring-ring/30"
      >
        <Bell className="size-5" aria-hidden="true" />
        {nonLues > 0 && (
          <span className="absolute top-1.5 right-1.5 flex min-w-4.5 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-4 font-bold text-white ring-2 ring-background">
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-carte"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-bold text-foreground">Notifications</p>
            {nonLues > 0 && (
              <button type="button" onClick={marquerLues} className="text-sm font-semibold text-step-blue hover:underline">
                Tout marquer comme lu
              </button>
            )}
          </div>
          {liste.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Aucune notification pour l&apos;instant. On te prévient dès que tes documents sont lus ou qu&apos;une
              simulation est terminée.
            </p>
          ) : (
            <ul className="max-h-[min(26rem,70vh)] overflow-y-auto py-1">
              {liste.map((n) => {
                const nouvelle = !vues.has(n.id)
                return (
                  <li key={n.id}>
                    <Link
                      href={n.href}
                      onClick={() => {
                        setOuvert(false)
                        marquerLues()
                      }}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 outline-none hover:bg-muted focus-visible:bg-muted',
                        nouvelle && 'bg-primary-soft/60',
                      )}
                    >
                      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', COULEUR[n.type])}>
                        <n.Icone className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">{n.titre}</span>
                          {nouvelle && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-danger" aria-label="Nouveau" />}
                        </span>
                        {n.texte && <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{n.texte}</span>}
                        {quand(n.date) && <span className="mt-1 block text-xs text-muted-foreground">{quand(n.date)}</span>}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
