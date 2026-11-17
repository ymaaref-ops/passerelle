'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { ArrowRight } from 'lucide-react'
import { envoyerReponseAgent, getStatutsAgents, type AgentId } from '@/lib/agents'
import { statutsInitiaux } from '@/lib/agents-simulation'
import { STEP_COLORS } from '@/lib/step-colors'
import { cn } from '@/lib/utils'
import { AgentCard } from './agent-card'
import { AgentLiveDialog } from './agent-live-dialog'
import { NotificationAgents } from './notification-agents'

const COULEUR = STEP_COLORS.green

export function AgentsDashboard() {
  const { data: agents = statutsInitiaux(), mutate } = useSWR('statuts-agents', getStatutsAgents, {
    fallbackData: statutsInitiaux(),
    refreshInterval: (dernier) => (dernier?.every((a) => a.statut === 'termine') ? 0 : 1000),
  })
  const [agentOuvert, setAgentOuvert] = useState<AgentId | null>(null)

  const total = agents.length
  const termines = agents.filter((a) => a.statut === 'termine').length
  const toutTermine = termines === total
  const progressionGlobale = Math.round(agents.reduce((somme, a) => somme + a.progression, 0) / total)

  async function envoyer(agentId: AgentId, reponse: string) {
    await envoyerReponseAgent(agentId, reponse)
    await mutate()
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 md:py-12">
      <NotificationAgents agents={agents} />

      <header className={cn('flex flex-col gap-6 rounded-3xl border p-6 sm:p-8', COULEUR.card)}>
        <div className="max-w-2xl">
          <p className={cn('text-sm font-semibold', COULEUR.text)}>Étape 4 sur 5</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            {toutTermine
              ? `Tes ${total} agents ont terminé`
              : `${total} agents travaillent en parallèle pour toi`}
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
            {toutTermine
              ? "Tout est prêt. Tu vas pouvoir vérifier chaque résultat avant l'envoi."
              : 'Reste sur cette page : un agent peut avoir besoin de toi à tout moment.'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xl font-bold text-foreground">
              <span className={COULEUR.text}>{termines}</span> sur {total} terminés
            </p>
            <p className="text-sm text-muted-foreground tabular-nums">{progressionGlobale} %</p>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressionGlobale}
            aria-label={`Progression globale : ${termines} sur ${total} agents terminés`}
            className="h-3 overflow-hidden rounded-full bg-foreground/10"
          >
            <div
              className={cn('h-full rounded-full transition-[width] duration-1000 ease-linear', COULEUR.solid)}
              style={{ width: `${progressionGlobale}%` }}
            />
          </div>
        </div>
      </header>

      <section aria-label="Détail des agents" className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onVoirEnDirect={() => setAgentOuvert(agent.id)}
            onEnvoyer={(reponse) => envoyer(agent.id, reponse)}
          />
        ))}
      </section>

      <footer className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {toutTermine ? (
          <Link
            href="/validation"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-step-green px-8 text-lg font-semibold text-white outline-none transition-colors hover:bg-step-green/90 focus-visible:ring-4 focus-visible:ring-step-green/30"
          >
            Voir les résultats
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        ) : (
          <p className="text-base text-muted-foreground">
            Le bouton « Voir les résultats » apparaîtra quand les {total} agents auront terminé.
          </p>
        )}
      </footer>

      <AgentLiveDialog
        agent={agents.find((a) => a.id === agentOuvert) ?? null}
        onFermer={() => setAgentOuvert(null)}
      />
    </div>
  )
}
