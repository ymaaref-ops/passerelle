import { BellRing, CircleCheck, Clock } from 'lucide-react'
import type { StatutAgent } from '@/lib/agents'
import { cn } from '@/lib/utils'

export const STYLES_STATUT: Record<
  StatutAgent,
  { label: string; badge: string; barre: string; carte: string }
> = {
  attente: {
    label: 'En attente',
    badge: 'border-border bg-muted text-muted-foreground',
    barre: 'bg-muted-foreground/40',
    carte: 'border-border bg-card',
  },
  en_cours: {
    label: 'En cours',
    badge: 'border-step-blue-border bg-step-blue-soft text-step-blue',
    barre: 'bg-step-blue',
    carte: 'border-step-blue-border bg-card',
  },
  besoin: {
    label: 'Besoin de toi',
    badge: 'border-step-orange bg-step-orange text-white',
    barre: 'bg-step-orange',
    carte:
      'border-2 border-step-orange bg-step-orange-soft shadow-lg shadow-step-orange/15 md:-translate-y-1',
  },
  termine: {
    label: 'Terminé',
    badge: 'border-step-green-border bg-step-green-soft text-step-green',
    barre: 'bg-step-green',
    carte: 'border-step-green-border bg-step-green-soft',
  },
}

export function StatutBadge({ statut }: { statut: StatutAgent }) {
  const style = STYLES_STATUT[statut]

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold',
        style.badge,
      )}
    >
      {statut === 'attente' && <Clock className="size-4" aria-hidden="true" />}
      {statut === 'en_cours' && (
        <span className="relative flex size-2.5" aria-hidden="true">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-step-blue opacity-50 motion-reduce:animate-none" />
          <span className="relative inline-flex size-2.5 rounded-full bg-step-blue" />
        </span>
      )}
      {statut === 'besoin' && <BellRing className="size-4" aria-hidden="true" />}
      {statut === 'termine' && <CircleCheck className="size-4" aria-hidden="true" />}
      {style.label}
    </span>
  )
}
