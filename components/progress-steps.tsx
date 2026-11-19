'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Check, ClipboardList, FileText, Flag, ListChecks, Star, UsersRound, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StepColor } from '@/lib/step-colors'

export const ETAPES: { href: string; label: string; detail: string; couleur: StepColor; Icone: LucideIcon }[] = [
  { href: '/situation', label: 'Situation', detail: 'Ta situation', couleur: 'blue', Icone: ClipboardList },
  { href: '/documents', label: 'Documents', detail: 'Dépôt des documents', couleur: 'blue', Icone: FileText },
  { href: '/aides', label: 'Aides', detail: 'Tes aides', couleur: 'violet', Icone: Star },
  { href: '/choix', label: 'Choix', detail: 'Choix des démarches', couleur: 'green', Icone: ListChecks },
  { href: '/agents', label: 'Agents', detail: 'Agents en action', couleur: 'green', Icone: UsersRound },
  { href: '/validation', label: 'Validation', detail: 'Validation', couleur: 'orange', Icone: Flag },
]

/** Index de l'étape correspondant à une adresse, ou -1. */
export function indexEtape(pathname: string): number {
  return ETAPES.findIndex((e) => pathname === e.href || pathname.startsWith(`${e.href}/`))
}

/** Le parcours en 6 étapes, façon tableau de bord : pastilles rondes reliées par une ligne. */
export function Parcours({ indexCourant, liens = false }: { indexCourant: number; liens?: boolean }) {
  const enCours = indexCourant >= 0
  const pourcentage = enCours ? ((indexCourant + 1) / ETAPES.length) * 100 : 0

  return (
    <nav aria-label="Progression des étapes" className="rounded-3xl bg-card px-4 py-4 shadow-carte sm:px-6 sm:py-5">
      {/* Mobile : résumé compact */}
      <div className="md:hidden">
        <p className="flex items-baseline justify-between text-sm">
          <span className="font-semibold text-foreground">
            {enCours ? `${indexCourant + 1}. ${ETAPES[indexCourant].detail}` : 'Prêt à commencer'}
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
          className="mt-2 h-2 overflow-hidden rounded-full bg-primary-soft"
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pourcentage}%` }} />
        </div>
      </div>

      {/* Bureau : toutes les étapes */}
      <ol className="hidden items-start md:flex">
        {ETAPES.map((etape, i) => {
          const terminee = enCours && i < indexCourant
          const actuelle = i === indexCourant
          const { Icone } = etape
          const pastille = (
            <span className="flex flex-col items-center gap-2 text-center">
              <span
                className={cn(
                  'flex size-12 shrink-0 items-center justify-center rounded-full transition-colors',
                  terminee && 'bg-primary text-primary-foreground',
                  actuelle && 'bg-primary text-primary-foreground ring-4 ring-primary-soft',
                  !terminee && !actuelle && 'bg-primary-soft text-step-blue',
                )}
              >
                {terminee ? <Check className="size-5" aria-hidden="true" /> : <Icone className="size-5" aria-hidden="true" />}
              </span>
              <span
                className={cn(
                  'max-w-[7.5rem] text-sm leading-tight',
                  actuelle ? 'font-bold text-foreground' : terminee ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )}
              >
                {i + 1}. {etape.detail}
              </span>
            </span>
          )
          return (
            <li key={etape.href} className="flex flex-1 items-start last:flex-none">
              <span aria-current={actuelle ? 'step' : undefined}>
                {liens && (terminee || actuelle) ? (
                  <Link href={etape.href} className="rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-ring/30">
                    {pastille}
                  </Link>
                ) : (
                  pastille
                )}
              </span>
              {i < ETAPES.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn('mx-2 mt-6 h-0.5 flex-1 rounded-full', terminee ? 'bg-primary' : 'bg-primary-soft')}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Barre d'étapes affichée en haut de chaque étape du parcours. */
export function ProgressSteps() {
  const pathname = usePathname()
  const index = indexEtape(pathname)
  if (index < 0) return null
  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 lg:px-10">
      <Parcours indexCourant={index} />
    </div>
  )
}
