import { BoutonPrecedent } from '@/components/bouton-precedent'
import type { Metadata } from 'next'
import { ChoixReel } from '@/components/choix/choix-reel'
import { GardeDocuments } from '@/components/garde-documents'
import { STEP_COLORS } from '@/lib/step-colors'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Choisis tes démarches — Passerelle',
  description:
    'Choisis les aides que Passerelle doit demander pour toi : APL, prêt étudiant, prime d’activité et plus. Rien n’est envoyé sans ton accord.',
}

export default function ChoixPage() {
  return (
    <GardeDocuments>
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10">
      <BoutonPrecedent href="/aides" label="Précédent : tes aides" className="mb-6" />
      <header className="en-tete-page mb-8">
        <p className={cn('inline-flex rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold', STEP_COLORS.green.text)}>Étape 4 sur 6</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
          Choisis tes démarches
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          Coche les aides que tu veux qu&apos;on demande pour toi. Tu pourras tout vérifier avant
          l&apos;envoi.
        </p>
      </header>

      <ChoixReel />
    </div>
    </GardeDocuments>
  )
}
