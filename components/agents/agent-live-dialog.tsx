'use client'

import { useEffect, useRef } from 'react'
import { ExternalLink, Lock, X } from 'lucide-react'
import type { AgentStatut } from '@/lib/agents'
import { StatutBadge } from './statut-badge'

interface AgentLiveDialogProps {
  agent: AgentStatut | null
  onFermer: () => void
}

function Squelette({ className }: { className: string }) {
  return <div className={`rounded-md bg-muted ${className}`} aria-hidden="true" />
}

export function AgentLiveDialog({ agent, onFermer }: AgentLiveDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const ouvert = agent !== null

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (ouvert && !dialog.open) dialog.showModal()
    if (!ouvert && dialog.open) dialog.close()
  }, [ouvert])

  return (
    <dialog
      ref={ref}
      aria-labelledby="titre-agent-direct"
      onClose={onFermer}
      onClick={(e) => {
        if (e.target === ref.current) onFermer()
      }}
      className="m-auto w-[min(92vw,44rem)] rounded-3xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-foreground/50"
    >
      {agent && (
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <h2 id="titre-agent-direct" className="text-xl font-bold text-primary">
                {agent.nom}
              </h2>
              <StatutBadge statut={agent.statut} />
            </div>
            <button
              type="button"
              onClick={onFermer}
              aria-label="Fermer la vue de l'agent"
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground outline-none hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div
            role="img"
            aria-label={`Aperçu du navigateur de l'agent sur ${agent.site}`}
            className="overflow-hidden rounded-2xl border border-border bg-background"
          >
            <div className="flex items-center gap-3 border-b border-border bg-muted px-4 py-2.5">
              <div className="flex gap-1.5" aria-hidden="true">
                <span className="size-3 rounded-full bg-danger/60" />
                <span className="size-3 rounded-full bg-step-orange/60" />
                <span className="size-3 rounded-full bg-step-green/60" />
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-card px-3 py-1 text-sm text-muted-foreground">
                <Lock className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">https://{agent.site}</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-5">
              <Squelette className="h-6 w-2/5" />
              <Squelette className="h-4 w-4/5" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Squelette className="h-11" />
                <Squelette className="h-11" />
                <Squelette className="h-11" />
                <div className="relative h-11 rounded-md border-2 border-step-blue bg-step-blue-soft">
                  <span
                    className="absolute -bottom-3 right-4 size-4 rotate-[-20deg] rounded-sm bg-step-blue"
                    style={{ clipPath: 'polygon(0 0, 100% 55%, 55% 60%, 40% 100%)' }}
                    aria-hidden="true"
                  />
                </div>
              </div>
              <Squelette className="h-10 w-32 self-end" />
            </div>
          </div>

          <p className="text-base text-foreground">
            <span className="font-semibold">En ce moment :</span> {agent.etape}
          </p>
          {agent.lienDirect ? (
            <a
              href={agent.lienDirect}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              Ouvrir la vraie session de l&apos;agent
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              {agent.demo
                ? "Agent de démonstration : aperçu simulé."
                : "Le lien vers la session de l'agent apparaîtra dès qu'elle aura démarré."}
            </p>
          )}
        </div>
      )}
    </dialog>
  )
}
