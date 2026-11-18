import type { Metadata } from 'next'
import { ChoixForm } from '@/components/choix/choix-form'
import { etudiantCourant } from '@/lib/data'
import { trierAides } from '@/lib/eligibilite'
import { GardeDocuments } from '@/components/garde-documents'
import { STEP_COLORS } from '@/lib/step-colors'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Choisis tes démarches — Passerelle',
  description:
    'Choisis les aides que Passerelle doit demander pour toi : APL, prêt étudiant, prime d’activité et plus. Rien n’est envoyé sans ton accord.',
}

export default function ChoixPage() {
  const { droit, peutEtre } = trierAides(etudiantCourant)

  return (
    <GardeDocuments>
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12">
      <header className="mb-8 max-w-2xl">
        <p className={cn('text-sm font-semibold', STEP_COLORS.green.text)}>Étape 4 sur 6</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Choisis tes démarches
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          Coche les aides que tu veux qu&apos;on demande pour toi. Tu pourras tout vérifier avant
          l&apos;envoi.
        </p>
      </header>

      <ChoixForm droit={droit} peutEtre={peutEtre} />
    </div>
    </GardeDocuments>
  )
}
