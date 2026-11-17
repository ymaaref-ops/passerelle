'use client'

import { Check, ExternalLink } from 'lucide-react'
import type { DemarcheId, DemarcheInfo } from '@/lib/validation'
import { cn } from '@/lib/utils'

interface BoutonEnvoiProps {
  demarche: DemarcheInfo
  /** Date d'envoi (ISO) si la démarche est déjà marquée « Envoyée ». */
  envoyeeLe?: string
  onEnvoyer: (id: DemarcheId) => void
  className?: string
}

export function BoutonEnvoi({ demarche, envoyeeLe, onEnvoyer, className }: BoutonEnvoiProps) {
  if (envoyeeLe) {
    return (
      <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', className)}>
        <span className="inline-flex h-11 items-center gap-2 rounded-full border border-step-green-border bg-step-green-soft pr-4 pl-2 text-sm font-semibold text-step-green">
          <span className="flex size-7 animate-check-pop items-center justify-center rounded-full bg-step-green text-white">
            <Check className="size-4" aria-hidden="true" />
          </span>
          Envoyée
          <span className="sr-only"> : {demarche.nom}</span>
        </span>
        <a
          href={demarche.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm text-sm font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-4 focus-visible:ring-ring/30"
        >
          Rouvrir le site officiel
          <span className="sr-only"> de {demarche.destinataire} (nouvel onglet)</span>
        </a>
      </div>
    )
  }

  function ouvrirEtMarquer() {
    // Doit rester synchrone avec le clic pour ne pas être bloqué par le navigateur.
    window.open(demarche.url, '_blank', 'noopener,noreferrer')
    onEnvoyer(demarche.id)
  }

  return (
    <button
      type="button"
      onClick={ouvrirEtMarquer}
      className={cn(
        'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-step-orange px-6 text-base font-semibold text-white outline-none transition-colors hover:bg-step-orange/90 focus-visible:ring-4 focus-visible:ring-step-orange/30',
        className,
      )}
    >
      J&apos;ai relu, j&apos;envoie
      <ExternalLink className="size-4" aria-hidden="true" />
      <span className="sr-only">
        : {demarche.nom}, ouvre {demarche.site} dans un nouvel onglet
      </span>
    </button>
  )
}
