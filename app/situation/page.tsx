import { BoutonPrecedent } from '@/components/bouton-precedent'
import type { Metadata } from 'next'
import { SituationForm } from '@/components/situation/situation-form'
import { STEP_COLORS } from '@/lib/step-colors'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Ta situation — Passerelle',
  description:
    'Trois questions sur ton logement, ton activité et ta bourse : on te demande seulement les documents utiles et on te montre toutes tes aides.',
}

export default function SituationPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:py-12">
      <BoutonPrecedent href="/demarrer" label="Précédent" className="mb-6" />
      <header className="mb-8">
        <p className={cn('text-sm font-semibold', STEP_COLORS.blue.text)}>Étape 1 sur 6</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary sm:text-4xl">Ta situation</h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          Trois questions rapides : on te demandera seulement les documents utiles, et on te
          montrera toutes les aides qui te concernent.
        </p>
      </header>
      <SituationForm />
    </div>
  )
}
