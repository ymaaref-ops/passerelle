import { cn } from '@/lib/utils'

/**
 * Logo Passerelle : une étudiante adossée au « P », livre à la main.
 * Éco-conçu : tracé au trait, sans aplats (moins d'encre et d'énergie à l'affichage).
 */
export function LogoSymbole({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 44 40"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('h-10 w-11 shrink-0', className)}
    >
      {/* Le P */}
      <path d="M22 5v30M22 5h7.5a8 8 0 0 1 0 16H22" className="stroke-primary" strokeWidth="3.4" />
      {/* L'étudiante, dos contre le P */}
      <g className="stroke-step-orange" strokeWidth="1.9">
        {/* Tête et queue de cheval qui touche le P */}
        <circle cx="14.6" cy="10.4" r="3.1" />
        <path d="M17.4 8.9c2 .4 2.9 2.2 2.6 4.6" />
        {/* Dos appuyé sur le P, jambes en avant */}
        <path d="M16.6 13.8l2.6 10.4" />
        <path d="M19.2 24.2l-6.4 1.2" />
        <path d="M12.8 25.4l1.6 9.8" />
        <path d="M19.2 24.2l-2.4 11" />
        {/* Bras et livre ouvert */}
        <path d="M17.4 16.6l-4.4 3.4" />
        <path d="M9.6 18.8l3.4 1.2 3.2-1.6M9.6 18.8l.8 3.6 2.6.8 3.2-1.6-.6-3.4M13 20l0 3.2" />
      </g>
    </svg>
  )
}
