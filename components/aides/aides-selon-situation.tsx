'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Search } from 'lucide-react'
import { AidesNonConcernees, AidesSection } from '@/components/aides/aides-section'
import { lireSituation, type Situation } from '@/lib/session'
import { ajusterSelonSituation, type AidesParStatut } from '@/lib/situation-aides'

/** Liste des aides adaptée à la situation donnée par l'étudiant, avec l'agent logement s'il en cherche un. */
export function AidesSelonSituation(aides: AidesParStatut) {
  const [situation, setSituation] = useState<Situation | null>(null)
  useEffect(() => setSituation(lireSituation()), [])
  const { droit, peutEtre, nonConcerne } = ajusterSelonSituation(aides, situation)

  return (
    <>
      {situation?.logement === 'cherche' && (
        <section
          aria-labelledby="titre-logement"
          className="flex flex-col gap-4 rounded-3xl border-2 border-step-violet-border bg-step-violet-soft p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-step-violet text-white">
              <Search className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 id="titre-logement" className="text-lg font-bold text-foreground">
                Pas encore de logement ? Notre agent t&apos;aide à en trouver un.
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Une fois ton logement trouvé, tu pourras aussi demander l&apos;APL avec Passerelle.
              </p>
            </div>
          </div>
          <Link
            href="/recherche-logement"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-step-violet px-5 font-semibold text-white outline-none transition-colors hover:bg-step-violet/90 focus-visible:ring-4 focus-visible:ring-ring/30"
          >
            Trouver un logement
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        </section>
      )}
      <AidesSection statut="droit" aides={droit} />
      <AidesSection statut="peut_etre" aides={peutEtre} />
      <AidesNonConcernees aides={nonConcerne} />
    </>
  )
}
