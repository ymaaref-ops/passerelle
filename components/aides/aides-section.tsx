import type { ReactNode } from 'react'
import { ChevronDown, CircleCheck, CircleHelp, CircleSlash } from 'lucide-react'
import type { AideEvaluee, StatutEligibilite } from '@/lib/eligibilite'
import { cn } from '@/lib/utils'
import { AideCard } from './aide-card'

const SECTIONS = {
  droit: {
    titre: 'Tu y as droit',
    description: 'Ces aides correspondent à ton profil.',
    icone: CircleCheck,
    pastille: 'bg-step-green text-white',
    compteur: 'bg-success-soft text-success',
  },
  peut_etre: {
    titre: 'Peut-être',
    description: 'Il manque une information pour être sûr.',
    icone: CircleHelp,
    pastille: 'bg-step-orange text-white',
    compteur: 'bg-step-orange-soft text-step-orange',
  },
  non_concerne: {
    titre: 'Non concerné',
    description: "Ces aides ne correspondent pas à ta situation aujourd'hui.",
    icone: CircleSlash,
    pastille: 'bg-muted-foreground text-white',
    compteur: 'bg-muted text-muted-foreground',
  },
} as const

function SectionHeading({
  id,
  statut,
  nombre,
}: {
  id: string
  statut: StatutEligibilite
  nombre: number
}) {
  const section = SECTIONS[statut]
  const Icone = section.icone
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', section.pastille)}
      >
        <Icone className="size-5" />
      </span>
      <div>
        <h2 id={id} className="flex items-center gap-2 text-xl font-bold text-foreground">
          {section.titre}
          <span className={cn('rounded-full px-2.5 py-0.5 text-sm font-semibold', section.compteur)}>
            {nombre}
          </span>
        </h2>
        <p className="text-sm text-muted-foreground">{section.description}</p>
      </div>
    </div>
  )
}

function Grille({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>
}

export function AidesSection({
  statut,
  aides,
}: {
  statut: Exclude<StatutEligibilite, 'non_concerne'>
  aides: AideEvaluee[]
}) {
  const headingId = `section-${statut}`
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5">
      <SectionHeading id={headingId} statut={statut} nombre={aides.length} />
      <Grille>
        {aides.map((evaluee) => (
          <AideCard key={evaluee.aide.id} evaluee={evaluee} />
        ))}
      </Grille>
    </section>
  )
}

// Repliée par défaut : <details> natif, accessible au clavier sans JavaScript.
export function AidesNonConcernees({ aides }: { aides: AideEvaluee[] }) {
  const headingId = 'section-non-concerne'
  return (
    <section aria-labelledby={headingId}>
      <details className="group rounded-3xl bg-card shadow-carte">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-3xl p-5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:p-6 [&::-webkit-details-marker]:hidden">
          <SectionHeading id={headingId} statut="non_concerne" nombre={aides.length} />
          <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <span className="group-open:hidden">Afficher</span>
            <span className="hidden group-open:inline">Masquer</span>
            <ChevronDown
              className="size-5 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </span>
        </summary>
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <Grille>
            {aides.map((evaluee) => (
              <AideCard key={evaluee.aide.id} evaluee={evaluee} />
            ))}
          </Grille>
        </div>
      </details>
    </section>
  )
}
