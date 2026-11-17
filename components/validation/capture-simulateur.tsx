import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CaptureSimulateurProps {
  site: string
  /** Nom du simulateur, repris dans la description pour les lecteurs d'écran. */
  nom: string
  className?: string
}

// Image provisoire : sera remplacée par la vraie capture d'écran prise par l'agent.
export function CaptureSimulateur({ site, nom, className }: CaptureSimulateurProps) {
  return (
    <figure className={cn('flex flex-col gap-2', className)}>
      <div
        role="img"
        aria-label={`Capture d'écran du simulateur ${nom} sur ${site} (image d'exemple)`}
        className="overflow-hidden rounded-2xl border border-border bg-card"
      >
        <div className="flex items-center gap-3 border-b border-border bg-muted px-3 py-2">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-danger/60" />
            <span className="size-2.5 rounded-full bg-warning/60" />
            <span className="size-2.5 rounded-full bg-success/60" />
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs text-muted-foreground">
            <Lock className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{site}</span>
          </span>
        </div>
        <div className="flex flex-col gap-3 p-4" aria-hidden="true">
          <span className="h-4 w-2/5 rounded-full bg-muted" />
          <span className="h-3 w-4/5 rounded-full bg-muted" />
          <div className="grid grid-cols-2 gap-3">
            <span className="h-9 rounded-xl bg-muted" />
            <span className="h-9 rounded-xl bg-muted" />
            <span className="h-9 rounded-xl bg-muted" />
            <span className="h-9 rounded-xl border-2 border-step-blue bg-step-blue-soft" />
          </div>
          <span className="ml-auto h-9 w-1/3 rounded-full bg-step-blue/20" />
        </div>
      </div>
      <figcaption className="text-xs text-muted-foreground">Capture du simulateur · {site} (exemple)</figcaption>
    </figure>
  )
}
