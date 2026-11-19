'use client'

import { usePathname } from 'next/navigation'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STEP_COLORS, type StepColor } from '@/lib/step-colors'

export const ETAPES: { href: string; label: string; couleur: StepColor }[] = [
  { href: '/situation', label: 'Situation', couleur: 'blue' },
  { href: '/documents', label: 'Documents', couleur: 'blue' },
  { href: '/aides', label: 'Aides', couleur: 'violet' },
  { href: '/choix', label: 'Choix', couleur: 'green' },
  { href: '/agents', label: 'Agents', couleur: 'green' },
  { href: '/validation', label: 'Validation', couleur: 'orange' },
]

export function ProgressSteps() {
  const pathname = usePathname()
  if (pathname === '/fenetre-agent') return null
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
              className={cn(
                'h-full rounded-full transition-all',
                enCours ? STEP_COLORS[ETAPES[indexCourant].couleur].solid : 'bg-primary',
              )}
              style={{ width: `${pourcentage}%` }}
            />
          </div>
        </div>

        {/* Bureau : toutes les étapes */}
        <ol className="hidden items-center md:flex">
          {ETAPES.map((etape, i) => {
            const terminee = enCours && i < indexCourant
            const actuelle = i === indexCourant
            const couleur = STEP_COLORS[etape.couleur]
            return (
              <li key={etape.href} className="flex flex-1 items-center last:flex-none">
                <span
                  aria-current={actuelle ? 'step' : undefined}
                  className="flex items-center gap-2"
                >
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      (terminee || actuelle) && ['text-primary-foreground', couleur.solid],
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
                    className={cn('mx-3 h-0.5 flex-1 rounded-full', terminee ? couleur.line : 'bg-border')}
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
