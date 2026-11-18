import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Home, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Démarrer ma session — Passerelle',
  description:
    'Dis-nous si tu as déjà un logement : on te montre tes aides, ou on t’aide d’abord à trouver où habiter.',
}

const CHOIX = [
  {
    href: '/documents',
    titre: "Oui, j'ai un logement",
    texte: 'Dépose tes documents : on te montre les aides auxquelles tu as droit, comme l’APL.',
    Icone: Home,
    couleur: 'border-step-blue-border bg-step-blue-soft hover:border-step-blue',
    pastille: 'bg-step-blue',
  },
  {
    href: '/recherche-logement',
    titre: 'Non, je cherche un logement',
    texte: 'Un agent t’aide d’abord à trouver où habiter.',
    Icone: Search,
    couleur: 'border-step-violet-border bg-step-violet-soft hover:border-step-violet',
    pastille: 'bg-step-violet',
  },
] as const

export default function DemarrerPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-16">
      <header className="mb-8">
        <p className="text-sm font-semibold text-primary">Ta session</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          As-tu déjà un logement ?
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          Ta réponse nous dit par où commencer. Tu pourras toujours revenir en arrière.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
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
