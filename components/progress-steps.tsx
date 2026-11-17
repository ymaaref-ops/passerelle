'use client'

import { usePathname } from 'next/navigation'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export const ETAPES = [
  { href: '/aides', label: 'Aides' },
  { href: '/documents', label: 'Documents' },
  { href: '/eligibilite', label: 'Éligibilité' },
  { href: '/confirmation', label: 'Confirmation' },
  { href: '/demarches', label: 'Démarches' },
  { href: '/validation', label: 'Validation' },
  { href: '/tableau-de-bord', label: 'Tableau de bord' },
] as const

export function ProgressSteps() {
  const pathname = usePathname()
  const indexCourant = ETAPES.findIndex((e) => pathname === e.href || pathname.startsWith(`${e.href}/`))
  const enCours = indexCourant >= 0
  const pourcentage = enCours ? ((indexCourant + 1) / ETAPES.length) * 100 : 0

  return (
    <nav aria-label="Progression des étapes" className="border-b border-border bg-card">
      <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 sm:py-4">
        {/* Mobile : résumé compact */}
        <div className="md:hidden">
          <p className="flex items-baseline justify-between text-sm">
            <span className="font-semibold text-foreground">
              {enCours ? ETAPES[indexCourant].label : 'Prêt à commencer'}
            </span>
            <span className="text-muted-foreground">
              {enCours ? `Étape ${indexCourant + 1} sur ${ETAPES.length}` : `${ETAPES.length} étapes`}
            </span>
          </p>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={ETAPES.length}
            aria-valuenow={enCours ? indexCourant + 1 : 0}
            aria-label="Progression"
            className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pourcentage}%` }}
            />
          </div>
        </div>

        {/* Bureau : toutes les étapes */}
        <ol className="hidden items-center md:flex">
          {ETAPES.map((etape, i) => {
            const terminee = enCours && i < indexCourant
            const actuelle = i === indexCourant
            return (
              <li key={etape.href} className="flex flex-1 items-center last:flex-none">
                <span
                  aria-current={actuelle ? 'step' : undefined}
                  className="flex items-center gap-2"
                >
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      terminee && 'bg-success text-primary-foreground',
                      actuelle && 'bg-primary text-primary-foreground',
                      !terminee && !actuelle && 'bg-muted text-muted-foreground',
                    )}
                  >
                    {terminee ? <Check className="size-4" aria-hidden="true" /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      'text-sm whitespace-nowrap',
                      actuelle ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {etape.label}
                  </span>
                </span>
                {i < ETAPES.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={cn('mx-3 h-0.5 flex-1 rounded-full', terminee ? 'bg-success' : 'bg-border')}
                  />
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
