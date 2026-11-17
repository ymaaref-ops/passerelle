import { AlertTriangle, CheckCircle2, CircleDashed } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatutDocumentUI = 'manquant' | 'analyse' | 'verifie' | 'probleme'

const PASTILLES = {
  manquant: {
    label: 'Manquant',
    icon: CircleDashed,
    className: 'bg-muted text-muted-foreground',
  },
  verifie: {
    label: 'Vérifié',
    icon: CheckCircle2,
    className: 'bg-success-soft text-success',
  },
  probleme: {
    label: 'Problème détecté',
    icon: AlertTriangle,
    className: 'bg-danger-soft text-danger ring-1 ring-danger/30',
  },
} as const

export function StatutPastille({ statut }: { statut: Exclude<StatutDocumentUI, 'analyse'> }) {
  const { label, icon: Icon, className } = PASTILLES[statut]
  return (
    <span
      key={statut}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold motion-safe:animate-check-pop',
        className,
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </span>
  )
}
