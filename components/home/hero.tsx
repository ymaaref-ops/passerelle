import Link from 'next/link'
import { ArrowRight, Camera, CheckCircle2, Home, MapPin } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { calculerAge, etudiantCourant as etudiant } from '@/lib/data'
import { cn } from '@/lib/utils'

export function Hero() {
  const age = calculerAge(etudiant.date_naissance)

  return (
    <section className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_1fr] md:items-center md:py-16">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary">
          <Camera className="size-4" aria-hidden="true" />
          Pensé pour ton téléphone
        </p>
        <h1 className="mt-5 text-4xl leading-tight font-bold tracking-tight text-balance text-primary sm:text-5xl">
          Toutes tes aides, une seule démarche.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
          Découvre les aides auxquelles tu as droit, dépose tes documents une seule fois, et
          laisse nos agents IA faire les démarches à ta place.{' '}
          <strong className="font-semibold text-foreground">
            Tu valides toujours toi-même avant l&apos;envoi.
          </strong>
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/aides"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'h-14 gap-2 rounded-2xl px-7 text-base font-semibold',
            )}
          >
            Découvrir mes aides
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
          <a
            href="#comment-ca-marche"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'h-14 rounded-2xl px-7 text-base font-semibold',
            )}
          >
            Comment ça marche ?
          </a>
        </div>
      </div>

      <aside
        aria-label="Exemple de profil étudiant"
        className="rounded-3xl border border-border bg-card p-6 shadow-sm"
      >
        <p className="text-sm font-medium text-muted-foreground">Profil de démonstration</p>
        <div className="mt-3 flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground"
          >
            {etudiant.prenom[0]}
            {etudiant.nom[0]}
          </span>
          <div>
            <p className="text-xl font-bold text-foreground">
              {etudiant.prenom} {etudiant.nom}
            </p>
            <p className="text-sm text-muted-foreground">
              {age} ans · {etudiant.alternant ? 'Alternante' : 'Étudiante'}
            </p>
          </div>
        </div>
        <ul className="mt-5 space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{etudiant.ecole}, Paris</span>
          </li>
          <li className="flex items-start gap-3">
            <Home className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Loyer {etudiant.loyer} € charges comprises · seule · {etudiant.meuble ? 'meublé' : 'non meublé'}
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            <span>
              Salaire d&apos;alternance{' '}
              {etudiant.salaire_alternance.toLocaleString('fr-FR')} € / mois
            </span>
          </li>
        </ul>
      </aside>
    </section>
  )
}
