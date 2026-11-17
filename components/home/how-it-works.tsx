import { Bot, FileUp, Search, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STEP_COLORS, type StepColor } from '@/lib/step-colors'

const ETAPES: {
  icon: typeof Search
  titre: string
  texte: string
  couleur: StepColor
}[] = [
  {
    icon: FileUp,
    titre: 'Dépose tes documents une fois',
    texte: 'Prends-les en photo avec ton téléphone. On les vérifie et on signale ce qui manque.',
    couleur: 'blue',
  },
  {
    icon: Search,
    titre: 'Découvre tes aides',
    texte: 'On te montre les aides auxquelles tu as droit, avec des explications simples et des montants estimés.',
    couleur: 'violet',
  },
  {
    icon: Bot,
    titre: 'Nos agents font les démarches',
    texte: 'Les agents IA remplissent tes dossiers (APL, prêt étudiant…) à ta place.',
    couleur: 'green',
  },
  {
    icon: ShieldCheck,
    titre: 'Tu valides avant l’envoi',
    texte: 'Rien ne part sans ton accord. Tu relis, tu corriges, tu confirmes.',
    couleur: 'orange',
  },
]

export function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="scroll-mt-4 border-y border-border bg-card">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 md:py-16">
        <h2 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
          Comment ça marche
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ETAPES.map(({ icon: Icon, titre, texte, couleur }, i) => {
            const c = STEP_COLORS[couleur]
            return (
              <li key={titre} className={cn('rounded-3xl border p-6', c.card)}>
                <span
                  className={cn(
                    'flex size-12 items-center justify-center rounded-2xl text-primary-foreground',
                    c.solid,
                  )}
                >
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <p className={cn('mt-4 text-sm font-semibold', c.text)}>Étape {i + 1}</p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">{titre}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{texte}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
