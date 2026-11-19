import { cn } from '@/lib/utils'

interface BarreMarcheurProps {
  /** Avancement de 0 à 100. */
  valeur: number
  label: string
  /** Classes de la partie remplie (couleur). */
  couleur: string
  className?: string
}

/**
 * Barre de progression avec un petit personnage (un étudiant et son sac à dos) qui marche jusqu'à 100 %.
 * Il marche tant que ça avance, et saute de joie une fois arrivé.
 */
export function BarreMarcheur({ valeur, label, couleur, className }: BarreMarcheurProps) {
  const v = Math.max(0, Math.min(100, Math.round(valeur)))
  const arrive = v >= 100
  return (
    <div className={cn('relative pt-12', className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 transition-[left] duration-1000 ease-linear"
        style={{ left: `clamp(20px, ${v}%, calc(100% - 20px))`, transform: 'translateX(-50%)' }}
      >
        <svg
          viewBox="0 0 40 48"
          width="40"
          height="48"
          className={cn('marcheur overflow-visible', arrive ? 'marcheur-arrive' : v > 0 && 'marcheur-marche')}
        >
          {/* Ombre */}
          <ellipse cx="20" cy="46" rx="9" ry="1.6" className="fill-foreground/15" />
          <g className="marcheur-corps">
            {/* Jambes */}
            <line x1="18" y1="30" x2="18" y2="43" className="marcheur-jambe-a stroke-foreground" strokeWidth="3.2" strokeLinecap="round" />
            <line x1="22" y1="30" x2="22" y2="43" className="marcheur-jambe-b stroke-foreground" strokeWidth="3.2" strokeLinecap="round" />
            {/* Sac à dos */}
            <rect x="9.5" y="17" width="7" height="11" rx="2.5" className="fill-step-orange" />
            {/* Corps */}
            <rect x="14" y="16" width="12" height="16" rx="5" className="fill-primary" />
            {/* Bras */}
            <line x1="21" y1="19" x2="21" y2="28" className="marcheur-bras stroke-primary" strokeWidth="3" strokeLinecap="round" />
            {/* Tête */}
            <circle cx="21" cy="9.5" r="6.5" className="fill-[#f2c9a0]" />
            {/* Cheveux */}
            <path d="M14.6 8.6 a6.5 6.5 0 0 1 12.8 -0.6 q-4 -1.6 -7 0.4 q-3 1.4 -5.8 0.2z" className="fill-foreground" />
            {/* Œil et sourire */}
            <circle cx="24" cy="9.8" r="0.9" className="fill-foreground" />
            <path d="M22.6 12.4 q1.6 1.2 3 0" className="stroke-foreground" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          </g>
          {arrive && (
            <g className="marcheur-etoiles">
              <path d="M5 6 l1 2.2 2.2 1 -2.2 1 -1 2.2 -1 -2.2 -2.2 -1 2.2 -1z" className="fill-step-orange" />
              <path d="M35 3 l0.8 1.8 1.8 0.8 -1.8 0.8 -0.8 1.8 -0.8 -1.8 -1.8 -0.8 1.8 -0.8z" className="fill-step-green" />
            </g>
          )}
        </svg>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        aria-label={label}
        className="h-3 overflow-hidden rounded-full bg-foreground/10"
      >
        <div className={cn('h-full rounded-full transition-[width] duration-1000 ease-linear', couleur)} style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}
