import { Info } from 'lucide-react'
import { DemarcheBadge } from '@/components/aides/aide-card'
import { premierePhrase, type AideEvaluee } from '@/lib/eligibilite'
import { cn } from '@/lib/utils'

interface AideChoixProps {
  evaluee: AideEvaluee
  coche: boolean
  onChange: (id: string, coche: boolean) => void
}

export function AideChoix({ evaluee, coche, onChange }: AideChoixProps) {
  const { aide, statut, raison } = evaluee
  const identifiant = `choix-${aide.id}`

  return (
    <li>
      <label
        htmlFor={identifiant}
        className={cn(
          'flex h-full cursor-pointer gap-4 rounded-3xl border bg-card p-5 transition-colors',
          'has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-step-green/40',
          'has-[:checked]:border-step-green has-[:checked]:bg-step-green-soft',
          statut === 'droit' ? 'border-step-green-border' : 'border-step-orange-border',
          'has-[:checked]:shadow-sm',
        )}
      >
        <input
          id={identifiant}
          type="checkbox"
          checked={coche}
          onChange={(e) => onChange(aide.id, e.target.checked)}
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-step-green outline-none"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-3">
          <span className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <span className="text-lg leading-snug font-bold text-foreground">{aide.nom}</span>
            <DemarcheBadge automatisee={aide.niveau === 'automatisee'} />
          </span>
          <span className="leading-relaxed text-muted-foreground">
            {premierePhrase(aide.explication)}
          </span>
          <span className="flex flex-col">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Montant estimé
            </span>
            <span
              className={cn(
                'text-xl leading-tight font-extrabold tracking-tight',
                statut === 'droit' ? 'text-step-green' : 'text-step-orange',
              )}
            >
              {aide.montant_estime}
            </span>
          </span>
          {raison && (
            <span className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0 text-step-orange" aria-hidden="true" />
              <span>{raison}</span>
            </span>
          )}
        </span>
      </label>
    </li>
  )
}
