'use client'

import Link from 'next/link'
import { BriefcaseBusiness, CircleAlert, Construction, CircleCheck, Globe, Home, KeyRound, Landmark, ShieldCheck, GraduationCap, ExternalLink } from 'lucide-react'
import type { AgentId, AgentStatut } from '@/lib/agents'
import { cn } from '@/lib/utils'
import { useSitesEnProbleme } from '@/components/alerte-sites'
import { SITES_PAR_AGENT } from '@/lib/etat-sites'
import { BarreMarcheur } from '@/components/barre-marcheur'
import { DemandeAgent } from './demande-agent'
import { DetailDemarche } from './detail-demarche'
import { adresseFenetre, ouvrirFenetre } from '@/lib/fenetre'
import { FormulaireAgent } from './formulaire-agent'
import { STYLES_STATUT, StatutBadge } from './statut-badge'

const ICONES: Record<AgentId, typeof Home> = {
  apl: Home,
  'prime-activite': BriefcaseBusiness,
  prets: Landmark,
  bourse: GraduationCap,
  visale: ShieldCheck,
  'mobili-jeune': KeyRound,
}

interface AgentCardProps {
  agent: AgentStatut
  onEnvoyer: (reponse: string) => Promise<void>
}

export function AgentCard({ agent, onEnvoyer }: AgentCardProps) {
  const Icone = ICONES[agent.id]
  const style = agent.interrompu
    ? { ...STYLES_STATUT.termine, barre: 'bg-step-orange', carte: 'border-step-orange-border bg-step-orange-soft' }
    : STYLES_STATUT[agent.statut]
  const idTitre = `titre-${agent.id}`
  // Site de l'agent en maintenance en ce moment (vérifié toutes les 15 min).
  const sitesEnPanne = useSitesEnProbleme(SITES_PAR_AGENT[agent.id])

  return (
    <article
      id={`agent-${agent.id}`}
      aria-labelledby={idTitre}
      className={cn(
        'flex scroll-mt-24 flex-col gap-5 rounded-3xl border p-5 transition-all duration-500 sm:p-6',
        style.carte,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Icone className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id={idTitre} className="text-lg font-bold leading-snug text-foreground">
              {agent.nom}
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Globe className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{agent.site}</span>
              {agent.bientot && (
                <span className="ml-1 shrink-0 rounded-full border border-border px-2 py-0.5 text-xs font-medium">
                  Avec toi
                </span>
              )}
            </p>
          </div>
        </div>
        {agent.interrompu ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-step-orange-border bg-card px-3 py-1 text-sm font-semibold text-step-orange">
            {agent.maintenance ? (
              <Construction className="size-4" aria-hidden="true" />
            ) : (
              <CircleAlert className="size-4" aria-hidden="true" />
            )}
            {agent.maintenance ? 'Site en maintenance' : 'À finir'}
          </span>
        ) : (
          <StatutBadge statut={agent.statut} />
        )}
      </header>

      {agent.bientot ? (
        <DemandeAgent aide={agent.id === 'visale' ? 'visale' : 'mobili_jeune'} />
      ) : (
      <>
      <div className="flex min-h-20 flex-col justify-center gap-2">
        {agent.statut === 'besoin' && <FormulaireAgent key={agent.id} agent={agent} onEnvoyer={onEnvoyer} />}

        {agent.statut === 'termine' && agent.interrompu && agent.maintenance && (
          <>
            <p className="flex items-center gap-2 text-sm font-semibold text-step-orange">
              <Construction className="size-4" aria-hidden="true" />
              {agent.site} était en maintenance
            </p>
            <p className="text-base leading-snug text-foreground">
              L&apos;agent n&apos;a pas pu finir. Réessaie quand le site sera revenu.
            </p>
            <Link href="/choix" className="text-sm font-semibold text-step-blue hover:underline">
              Relancer depuis « Mes démarches »
            </Link>
          </>
        )}

        {agent.statut === 'termine' && agent.interrompu && !agent.maintenance && (
          <>
            <p className="flex items-center gap-2 text-sm font-semibold text-step-orange">
              <CircleAlert className="size-4" aria-hidden="true" />
              L&apos;agent s&apos;est arrêté à
            </p>
            <p className="text-xl font-bold leading-tight text-foreground">{agent.resultat}</p>
          </>
        )}

        {agent.statut === 'termine' && !agent.interrompu && (
          <>
            <p className="flex items-center gap-2 text-sm font-semibold text-step-green">
              <CircleCheck className="size-4" aria-hidden="true" />
              Résultat
            </p>
            <p className="text-2xl font-bold leading-tight text-step-green">{agent.resultat}</p>
          </>
        )}

        {(agent.statut === 'en_cours' || agent.statut === 'attente') && (
          <p
            className={cn(
              'text-base leading-relaxed',
              agent.reprise ? 'font-semibold text-step-blue' : 'text-foreground',
              agent.statut === 'attente' && 'text-muted-foreground',
            )}
          >
            {agent.reprise && <CircleCheck className="mr-2 inline size-5 align-text-bottom" aria-hidden="true" />}
            {agent.etape}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Avancement</span>
          <span className="font-semibold text-foreground tabular-nums">{agent.progression} %</span>
        </div>
        <BarreMarcheur
          valeur={agent.progression}
          label={`Avancement : ${agent.nom}`}
          couleur={style.barre}
          className="mt-1"
        />
      </div>

      {agent.lienDirect && (
        <button
          type="button"
          onClick={() =>
            ouvrirFenetre(agent.lienDirect!.includes('/share/') ? adresseFenetre('', agent.lienDirect!) : agent.lienDirect!)
          }
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-full border border-border bg-card px-4 text-sm font-semibold text-step-blue outline-none hover:bg-primary-soft focus-visible:ring-4 focus-visible:ring-ring/30"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          Ouvrir l&apos;agent (pas à pas)
        </button>
      )}

      {sitesEnPanne.length > 0 && (agent.statut === 'en_cours' || agent.statut === 'attente') && (
        <p className="flex items-start gap-2 rounded-2xl bg-step-orange-soft p-3 text-sm text-foreground">
          <Construction className="mt-0.5 size-4 shrink-0 text-step-orange" aria-hidden="true" />
          {sitesEnPanne.map((s) => s.nom).join(', ')} {sitesEnPanne.length > 1 ? 'sont' : 'est'} en maintenance en ce
          moment : l&apos;agent risque de s&apos;arrêter.
        </p>
      )}

      <DetailDemarche agent={agent} />

      </>
      )}
    </article>
  )
}
