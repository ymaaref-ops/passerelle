'use client'

import { BellRing } from 'lucide-react'
import type { AgentStatut } from '@/lib/agents'

interface NotificationAgentsProps {
  agents: AgentStatut[]
}

function aller(id: string) {
  const carte = document.getElementById(`agent-${id}`)
  carte?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  carte?.querySelector<HTMLElement>('input')?.focus({ preventScroll: true })
}

export function NotificationAgents({ agents }: NotificationAgentsProps) {
  const enAttente = agents.filter((a) => a.statut === 'besoin')

  return (
    <div role="status" aria-live="polite" className="sticky top-3 z-30 empty:hidden">
      {enAttente.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-step-orange bg-step-orange-soft p-4 shadow-lg shadow-step-orange/15 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-step-orange text-white">
              <BellRing className="size-5" aria-hidden="true" />
            </span>
            <p className="text-base font-bold text-foreground">
              {enAttente.length === 1
                ? 'Un agent a besoin de toi pour continuer.'
                : `${enAttente.length} agents ont besoin de toi pour continuer.`}
            </p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {enAttente.map((agent) => (
              <li key={agent.id}>
                <button
                  type="button"
                  onClick={() => aller(agent.id)}
                  className="inline-flex h-11 items-center rounded-full bg-step-orange px-5 text-sm font-semibold text-white outline-none hover:bg-step-orange/90 focus-visible:ring-4 focus-visible:ring-step-orange/30"
                >
                  {agent.id === 'apl' ? 'Simulation APL' : agent.nom.replace('Prêt étudiant – ', '')}
                  {' : '}
                  {agent.demande?.type === 'code' ? 'saisir le code' : 'répondre'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
