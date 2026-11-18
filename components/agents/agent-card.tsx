'use client'

import { BriefcaseBusiness, CircleCheck, Globe, Home, KeyRound, Landmark, ShieldCheck } from 'lucide-react'
import type { AgentId, AgentStatut } from '@/lib/agents'
import { cn } from '@/lib/utils'
import { FormulaireAgent } from './formulaire-agent'
import { STYLES_STATUT, StatutBadge } from './statut-badge'

const ICONES: Record<AgentId, typeof Home> = {
  apl: Home,
  'prime-activite': BriefcaseBusiness,
  prets: Landmark,
  visale: ShieldCheck,
  'mobili-jeune': KeyRound,
}

interface AgentCardProps {
  agent: AgentStatut
  onEnvoyer: (reponse: string) => Promise<void>
}

export function AgentCard({ agent, onEnvoyer }: AgentCardProps) {
  const Icone = ICONES[agent.id]
  const style = STYLES_STATUT[agent.statut]
  const idTitre = `titre-${agent.id}`

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
                  Bientôt
                </span>
              )}
            </p>
          </div>
        </div>
        <StatutBadge statut={agent.statut} />
      </header>

      <div className="flex min-h-20 flex-col justify-center gap-2">
        {agent.statut === 'besoin' && <FormulaireAgent key={agent.id} agent={agent} onEnvoyer={onEnvoyer} />}

        {agent.statut === 'termine' && (
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
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={agent.progression}
          aria-label={`Avancement : ${agent.nom}`}
          className="h-2.5 overflow-hidden rounded-full bg-foreground/10"
        >
          <div
            className={cn('h-full rounded-full transition-[width] duration-1000 ease-linear', style.barre)}
            style={{ width: `${agent.progression}%` }}
          />
        </div>
      </div>

    </article>
  )
}
