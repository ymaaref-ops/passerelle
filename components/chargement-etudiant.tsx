import { cn } from '@/lib/utils'

/**
 * Indicateur de chargement aux couleurs de Passerelle : le petit étudiant (sac à dos) marche avec une loupe
 * pendant que des maisons défilent derrière lui. Remplace le petit rond qui tourne.
 */
export function ChargementEtudiant({ className, taille = 64 }: { className?: string; taille?: number }) {
  return (
    <svg
      viewBox="0 0 96 64"
      width={taille * 1.5}
      height={taille}
      aria-hidden="true"
      className={cn('marcheur marcheur-marche shrink-0 overflow-hidden', className)}
    >
      <defs>
        <clipPath id="chargement-cadre">
          <rect width="96" height="64" rx="14" />
        </clipPath>
      </defs>
      <g clipPath="url(#chargement-cadre)">
        <rect width="96" height="64" className="fill-primary-soft" />
        {/* Maisons qui défilent (le motif se répète tous les 60 px) */}
        <g className="chargement-decor">
          {[0, 60, 120].map((x) => (
            <g key={x} transform={`translate(${x} 0)`}>
              <polygon points="6,40 16,31 26,40" className="fill-step-blue/40" />
              <rect x="8" y="40" width="16" height="14" className="fill-step-blue/25" />
              <rect x="14" y="46" width="4" height="8" className="fill-step-blue/40" />
              <rect x="36" y="30" width="16" height="24" className="fill-step-blue/20" />
              <rect x="39" y="34" width="4" height="4" className="fill-card" />
              <rect x="45" y="34" width="4" height="4" className="fill-card" />
              <rect x="39" y="41" width="4" height="4" className="fill-card" />
              <rect x="45" y="41" width="4" height="4" className="fill-card" />
            </g>
          ))}
        </g>
        <rect y="54" width="96" height="10" className="fill-step-blue/15" />
        {/* Le bonhomme, au centre */}
        <g transform="translate(30 8)">
          <ellipse cx="20" cy="46" rx="9" ry="1.6" className="fill-foreground/15" />
          <g className="marcheur-corps">
            <line x1="18" y1="30" x2="18" y2="43" className="marcheur-jambe-a stroke-foreground" strokeWidth="3.2" strokeLinecap="round" />
            <line x1="22" y1="30" x2="22" y2="43" className="marcheur-jambe-b stroke-foreground" strokeWidth="3.2" strokeLinecap="round" />
            <rect x="9.5" y="17" width="7" height="11" rx="2.5" className="fill-step-orange" />
            <rect x="14" y="16" width="12" height="16" rx="5" className="fill-primary" />
            {/* Bras tendu avec la loupe */}
            <g className="chargement-loupe">
              <line x1="22" y1="20" x2="31" y2="22" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
              <circle cx="35" cy="21" r="4.2" className="fill-card/70 stroke-foreground" strokeWidth="1.6" />
            </g>
            <circle cx="21" cy="9.5" r="6.5" className="fill-[#f2c9a0]" />
            <path d="M14.6 8.6 a6.5 6.5 0 0 1 12.8 -0.6 q-4 -1.6 -7 0.4 q-3 1.4 -5.8 0.2z" className="fill-foreground" />
            <circle cx="24" cy="9.8" r="0.9" className="fill-foreground" />
            <path d="M22.6 12.4 q1.6 1.2 3 0" className="stroke-foreground" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          </g>
        </g>
      </g>
    </svg>
  )
}
