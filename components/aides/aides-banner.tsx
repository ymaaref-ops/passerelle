import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { formaterEuros } from '@/lib/eligibilite'

interface AidesBannerProps {
  prenom: string
  totalMensuel: number
  pretMaximum: number
  nombreDroits: number
}

export function AidesBanner({ prenom, totalMensuel, pretMaximum, nombreDroits }: AidesBannerProps) {
  return (
    <section
      aria-labelledby="recap-aides"
      className="flex flex-col gap-6 rounded-3xl bg-gradient-to-br from-step-violet to-primary p-6 text-white sm:p-8 md:flex-row md:items-center md:justify-between"
    >
      <div className="max-w-xl">
        <p className="flex items-center gap-2 text-sm font-semibold text-white/90">
          <Sparkles className="size-4" aria-hidden="true" />
          {prenom}, voici ce qui t&apos;attend
        </p>
        <h2 id="recap-aides" className="mt-2 text-2xl leading-tight font-bold text-balance sm:text-3xl">
          Jusqu&apos;à <span className="whitespace-nowrap">{formaterEuros(totalMensuel)}/mois</span>{' '}
          d&apos;aides et un prêt jusqu&apos;à{' '}
          <span className="whitespace-nowrap">{formaterEuros(pretMaximum)}</span>
        </h2>
        <p className="mt-2 text-white/85">
          {nombreDroits} aides auxquelles tu as probablement droit. Montants estimés, à confirmer
          lors de chaque démarche.
        </p>
      </div>
      <Link
        href="/choix"
        className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 text-base font-semibold text-primary transition-colors hover:bg-white/90 focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none"
      >
        Choisir mes démarches
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  )
}
