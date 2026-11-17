import { Bot, CalendarClock, Compass, ExternalLink, Info } from 'lucide-react'
import { formaterDate, premierePhrase, type AideEvaluee } from '@/lib/eligibilite'
import { cn } from '@/lib/utils'

const STYLES = {
  droit: {
    card: 'border-step-green-border bg-card',
    montant: 'bg-step-green-soft text-step-green',
    raison: '',
  },
  peut_etre: {
    card: 'border-step-orange-border bg-card',
    montant: 'bg-step-orange-soft text-step-orange',
    raison: 'border-step-orange-border bg-step-orange-soft text-foreground',
  },
  non_concerne: {
    card: 'border-border bg-muted/60',
    montant: 'bg-muted text-muted-foreground',
    raison: 'border-border bg-card text-muted-foreground',
  },
} as const

function DemarcheBadge({ automatisee }: { automatisee: boolean }) {
  if (automatisee) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-step-green-border bg-success-soft px-3 py-1 text-xs font-semibold text-success">
        <Bot className="size-3.5" aria-hidden="true" />
        Passerelle s&apos;en occupe
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-step-blue-border bg-step-blue-soft px-3 py-1 text-xs font-semibold text-step-blue">
      <Compass className="size-3.5" aria-hidden="true" />
      Démarche guidée
    </span>
  )
}

export function AideCard({ evaluee }: { evaluee: AideEvaluee }) {
  const { aide, statut, raison } = evaluee
  const style = STYLES[statut]

  return (
    <article className={cn('flex flex-col gap-4 rounded-3xl border p-5 sm:p-6', style.card)}>
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h3 className="text-lg leading-snug font-bold text-foreground">{aide.nom}</h3>
        <DemarcheBadge automatisee={aide.niveau === 'automatisee'} />
      </header>

      <p className="leading-relaxed text-muted-foreground">{premierePhrase(aide.explication)}</p>

      <div className={cn('rounded-2xl px-4 py-3', style.montant)}>
        <p className="text-xs font-semibold tracking-wide uppercase">Montant estimé</p>
        <p className="mt-0.5 text-2xl leading-tight font-extrabold tracking-tight">
          {aide.montant_estime}
        </p>
      </div>

      {raison && (
        <p
          className={cn(
            'flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm leading-relaxed',
            style.raison,
          )}
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">
              {statut === 'peut_etre' ? 'Pourquoi peut-être : ' : 'Pourquoi pas pour toi : '}
            </span>
            {raison}
          </span>
        </p>
      )}

      <dl className="flex flex-col gap-3 text-sm">
        <div>
          <dt className="font-semibold text-foreground">Conditions principales</dt>
          <dd className="mt-0.5 leading-relaxed text-muted-foreground">
            {premierePhrase(aide.conditions)}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <dt className="font-semibold text-foreground">Date limite :</dt>
          <dd className="text-muted-foreground">
            {aide.date_limite ? formaterDate(aide.date_limite) : 'Pas de date limite'}
          </dd>
        </div>
      </dl>

      <footer className="mt-auto border-t border-border pt-4">
        <a
          href={aide.lien_officiel}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-step-blue underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Source officielle
          <span className="sr-only">pour {aide.nom} (s&apos;ouvre dans un nouvel onglet)</span>
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </footer>
    </article>
  )
}
