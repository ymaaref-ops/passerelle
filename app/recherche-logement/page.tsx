import type { Metadata } from 'next'
import { RechercheLogement } from '@/components/logement/recherche-logement'

export const metadata: Metadata = {
  title: 'Trouver un logement — Passerelle',
  description:
    'Un agent Passerelle cherche des logements étudiants, estime ton aide au logement pour chacun et calcule ce que tu paieras vraiment.',
}

export default function RechercheLogementPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10">
      <header className="en-tete-page mb-8">
        <p className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-step-violet">Trouver un logement</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
          On t&apos;aide à trouver un logement
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          Dis-nous où et combien tu peux payer. Notre agent cherche des annonces et te montre, pour chacune, ce
          qu&apos;il te restera à payer une fois l&apos;aide au logement déduite.
        </p>
      </header>
      <RechercheLogement />
    </div>
  )
}
