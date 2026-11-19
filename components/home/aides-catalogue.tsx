import { Bot, Compass, Info } from 'lucide-react'
import { aides, CATEGORIES, NIVEAUX, type NiveauAide } from '@/lib/data'
import { cn } from '@/lib/utils'

const NIVEAU_STYLE: Record<NiveauAide, { icon: typeof Bot; classes: string }> = {
  automatisee: { icon: Bot, classes: 'bg-success-soft text-success' },
  guidee: { icon: Compass, classes: 'bg-primary-soft text-primary' },
  information: { icon: Info, classes: 'bg-muted text-muted-foreground' },
}

export function AidesCatalogue() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 md:py-16">
      <h2 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
        {aides.length} aides dans notre catalogue
      </h2>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Montants indicatifs : le calcul précis pour ta situation vient à l&apos;étape suivante.
      </p>

      <ul className="mt-6 flex flex-wrap gap-2" aria-label="Légende des niveaux d'aide">
        {(Object.keys(NIVEAUX) as NiveauAide[]).map((niveau) => {
          const { icon: Icon, classes } = NIVEAU_STYLE[niveau]
          return (
            <li
              key={niveau}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
                classes,
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {NIVEAUX[niveau].label}
            </li>
          )
        })}
      </ul>

      <div className="mt-10 space-y-10">
        {CATEGORIES.map((categorie) => {
          const liste = aides.filter((a) => a.categorie === categorie)
          if (liste.length === 0) return null
          return (
            <div key={categorie}>
              <h3 className="text-xl font-semibold text-foreground">{categorie}</h3>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {liste.map((aide) => {
                  const { icon: Icon, classes } = NIVEAU_STYLE[aide.niveau]
                  return (
                    <li
                      key={aide.id}
                      className="flex flex-col rounded-3xl bg-card shadow-carte p-5"
                    >
                      <span
                        className={cn(
                          'inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                          classes,
                        )}
                      >
                        <Icon className="size-3.5" aria-hidden="true" />
                        {NIVEAUX[aide.niveau].label}
                      </span>
                      <h4 className="mt-3 text-lg font-semibold text-foreground">{aide.nom}</h4>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {aide.explication}
                      </p>
                      <p className="mt-4 text-base font-bold text-primary">{aide.montant_estime}</p>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
