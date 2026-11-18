import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Trouver un logement — Passerelle',
  description: 'Un agent Passerelle t’aide à trouver un logement étudiant.',
}

// Emplacement de l'agent de recherche de logement (en cours de construction).
// Quand il sera prêt, cette page le lancera, comme la page Agents lance l'agent APL.
export default function RechercheLogementPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-16">
      <div className="flex flex-col gap-5 rounded-3xl border-2 border-step-violet-border bg-step-violet-soft p-6 sm:p-8">
        <span className="flex size-12 items-center justify-center rounded-full bg-step-violet text-white">
          <Search className="size-6" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-step-violet">Bientôt disponible</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            On t&apos;aide à trouver un logement
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
            Un agent Passerelle cherchera des logements adaptés à ton budget et à ton école. Une
            fois ton logement trouvé, reviens ici : on s&apos;occupera de tes aides, comme l&apos;APL.
          </p>
        </div>
        <Link
          href="/demarrer"
          className="inline-flex h-12 items-center gap-2 self-start rounded-full border border-border bg-card px-5 font-semibold text-primary outline-none transition-colors hover:bg-primary-soft focus-visible:ring-4 focus-visible:ring-ring/30"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Revenir au choix
        </Link>
      </div>
    </div>
  )
}
