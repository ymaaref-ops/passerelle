import type { Metadata } from 'next'
import { AidesBanner } from '@/components/aides/aides-banner'
import { AidesNonConcernees, AidesSection } from '@/components/aides/aides-section'
import { calculerAge, etudiantCourant } from '@/lib/data'
import { trierAides } from '@/lib/eligibilite'
import { GardeDocuments } from '@/components/garde-documents'
import { STEP_COLORS } from '@/lib/step-colors'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Tes aides — Passerelle',
  description:
    'Découvre les aides étudiantes auxquelles tu as droit : APL, prime d’activité, prêts étudiants, bourse CROUS, avec des montants estimés et les conditions en clair.',
}

export default function AidesPage() {
  const { droit, peutEtre, nonConcerne, totalMensuel, pretMaximum } = trierAides(etudiantCourant)
  const { prenom, alternant, loyer, date_naissance } = etudiantCourant

  return (
    <GardeDocuments>
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12">
      <header className="mb-8 max-w-2xl">
        <p className={cn('text-sm font-semibold', STEP_COLORS.violet.text)}>Étape 2 sur 5</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Tes aides
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          Pour {prenom}, {calculerAge(date_naissance)} ans{alternant ? ', en alternance' : ''}, avec
          un loyer de {loyer} €. Voici ce qu&apos;on a trouvé, trié par chances d&apos;y avoir droit.
        </p>
      </header>

      <div className="flex flex-col gap-10">
        <AidesBanner
          prenom={prenom}
          totalMensuel={totalMensuel}
          pretMaximum={pretMaximum}
          nombreDroits={droit.length}
        />
        <AidesSection statut="droit" aides={droit} />
        <AidesSection statut="peut_etre" aides={peutEtre} />
        <AidesNonConcernees aides={nonConcerne} />
      </div>
    </div>
    </GardeDocuments>
  )
}
