import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Hero } from '@/components/home/hero'
import { HowItWorks } from '@/components/home/how-it-works'
import { AidesCatalogue } from '@/components/home/aides-catalogue'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <AidesCatalogue />
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="rounded-3xl bg-primary p-8 text-center text-primary-foreground sm:p-12">
          <h2 className="text-2xl font-bold text-balance sm:text-3xl">
            Prêt à récupérer ce qui t&apos;est dû ?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
            Ça prend quelques minutes, et tu gardes la main sur chaque envoi.
          </p>
          <Link
            href="/aides"
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'lg' }),
              'mt-6 h-14 gap-2 rounded-2xl px-7 text-base font-semibold',
            )}
          >
            Commencer
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        </div>
      </section>
      <footer className="border-t border-border bg-card py-6 text-center text-sm text-muted-foreground">
        Passerelle · Données fictives de démonstration
      </footer>
    </>
  )
}
