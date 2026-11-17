import Link from 'next/link'
import { AlertTriangle, ArrowRight, Check, Loader2, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import type { Controle } from '@/lib/documents-demo'
import { cn } from '@/lib/utils'

interface ControleCroiseProps {
  ref?: React.Ref<HTMLElement>
  controles: Controle[]
  resolus: number
  onRemplacer: (controle: Controle) => void
}

function Marqueur({ etat }: { etat: 'attente' | 'cours' | 'ok' | 'echec' }) {
  if (etat === 'ok') {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success text-primary-foreground motion-safe:animate-check-pop">
        <Check className="size-5" aria-hidden="true" />
        <span className="sr-only">Validé</span>
      </span>
    )
  }
  if (etat === 'echec') {
    return (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive text-primary-foreground motion-safe:animate-check-pop">
        <X className="size-6" aria-hidden="true" />
        <span className="sr-only">Échec</span>
      </span>
    )
  }
  if (etat === 'cours') {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card text-step-blue ring-2 ring-step-blue-border">
        <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" />
        <span className="sr-only">Vérification en cours</span>
      </span>
    )
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border bg-card">
      <span className="sr-only">En attente</span>
    </span>
  )
}

export function ControleCroise({ ref, controles, resolus, onRemplacer }: ControleCroiseProps) {
  const fini = resolus >= controles.length
  const echecs = fini ? controles.filter((c) => !c.ok) : []
  const echec = echecs.length > 0
  const succes = fini && !echec

  return (
    <div className={cn(echec && 'motion-safe:animate-alert-shake')}>
      <section
        ref={ref}
        aria-labelledby="titre-controle"
        className={cn(
          'scroll-mt-4 rounded-3xl border-2 p-5 transition-colors duration-500 sm:p-8',
          echec && 'border-destructive bg-danger-soft motion-safe:animate-alert-ring',
          succes && 'border-success/50 bg-success-soft',
          !fini && 'border-step-blue-border bg-step-blue-soft',
        )}
      >
        <div className="flex items-start gap-4">
          <span
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-2xl text-primary-foreground transition-colors duration-500',
              echec ? 'bg-destructive' : succes ? 'bg-success' : 'bg-step-blue',
            )}
          >
            {echec ? (
              <AlertTriangle className="size-6" aria-hidden="true" />
            ) : (
              <ShieldCheck className="size-6" aria-hidden="true" />
            )}
          </span>
          <div>
            <h2 id="titre-controle" className="text-xl font-bold text-foreground sm:text-2xl">
              Contrôle croisé
            </h2>
            <p className="mt-1 text-muted-foreground">
              {echec
                ? 'Un document pose problème. Corrige-le pour continuer sans risque de refus.'
                : succes
                  ? 'Tout est cohérent : tes documents peuvent être utilisés pour tes démarches.'
                  : 'On compare tes documents entre eux pour éviter un refus.'}
            </p>
          </div>
        </div>

        <ol className="mt-6 flex flex-col gap-3">
          {controles.map((controle, i) => {
            const etat = i < resolus ? (controle.ok ? 'ok' : 'echec') : i === resolus ? 'cours' : 'attente'
            return (
              <li
                key={controle.id}
                className={cn(
                  'flex items-start gap-3 rounded-2xl border bg-card p-4 transition-colors',
                  etat === 'echec' ? 'border-2 border-destructive p-5' : 'border-border',
                )}
              >
                <Marqueur etat={etat} />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'font-medium',
                      etat === 'attente' && 'text-muted-foreground',
                      etat === 'echec' ? 'text-sm font-semibold text-danger' : 'text-foreground',
                    )}
                  >
                    {controle.libelle}
                  </p>
                  {etat === 'echec' && (
                    <div role="alert" className="mt-2 motion-safe:animate-row-in">
                      <p className="text-xl leading-snug font-bold text-danger sm:text-2xl">
                        {controle.erreur}
                      </p>
                      {controle.detail && (
                        <p className="mt-2 leading-relaxed text-foreground/80">{controle.detail}</p>
                      )}
                      <Button
                        type="button"
                        onClick={() => onRemplacer(controle)}
                        className="mt-4 h-12 w-full rounded-2xl bg-destructive px-6 text-base font-semibold text-primary-foreground hover:bg-destructive/90 sm:w-auto"
                      >
                        <RefreshCw aria-hidden="true" />
                        Remplacer ce document
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>

        {succes && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between motion-safe:animate-row-in">
            <p className="font-semibold text-success">Parfait, tes 4 documents sont vérifiés.</p>
            <Link
              href="/aides"
              className={cn(buttonVariants({ size: 'lg' }), 'h-12 gap-2 rounded-2xl px-6 text-base font-semibold')}
            >
              Voir mes aides
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
