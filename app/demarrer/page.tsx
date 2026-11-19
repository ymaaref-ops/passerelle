import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Search, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Démarrer ma session — Passerelle',
  description:
    'Découvre toutes tes aides étudiantes, ou fais-toi aider pour trouver un logement.',
}

const CHOIX = [
  {
    href: '/situation',
    titre: 'Découvrir toutes mes aides',
    texte:
      'Logement, études, travail, santé, vie quotidienne : on trouve tout ce à quoi tu as droit, et nos agents font les démarches.',
    Icone: Sparkles,
    couleur: 'border-step-blue bg-step-blue-soft hover:border-step-blue sm:col-span-2',
    pastille: 'bg-step-blue',
  },
  {
    href: '/recherche-logement',
    titre: 'Trouver un logement',
    texte: 'Pas encore de logement ? Un agent t’aide à en trouver un adapté à ton budget.',
    Icone: Search,
    couleur: 'border-step-violet-border bg-step-violet-soft hover:border-step-violet sm:col-span-2',
    pastille: 'bg-step-violet',
  },
] as const

export default function DemarrerPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10">
      <header className="en-tete-page mb-8">
        <p className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-step-blue">Ta session</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
          Par quoi on commence ?
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          Tu pourras faire l&apos;un puis l&apos;autre : une fois ton logement trouvé, on s&apos;occupe
          aussi de tes aides.
        </p>
      </header>

      <ul className="grid max-w-4xl gap-4 sm:grid-cols-2">
        {CHOIX.map(({ href, titre, texte, Icone, couleur, pastille }) => (
          <li key={href}>
            <Link
              href={href}
              className={cn(
                'group flex h-full flex-col gap-4 rounded-3xl border-2 p-6 outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ring/30',
                couleur,
              )}
            >
              <span
                className={cn(
                  'flex size-12 items-center justify-center rounded-full text-white',
                  pastille,
                )}
              >
                <Icone className="size-6" aria-hidden="true" />
              </span>
              <span className="text-xl font-bold text-foreground">{titre}</span>
              <span className="leading-relaxed text-muted-foreground">{texte}</span>
              <span className="mt-auto inline-flex items-center gap-2 font-semibold text-primary">
                Continuer
                <ArrowRight
                  className="size-5 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
