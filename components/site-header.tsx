import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { MenuCompte } from '@/components/compte/menu-compte'
import { EMAIL_SUPPORT, lienSupport } from '@/lib/support'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg text-xl font-bold tracking-tight text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground"
          >
            P
          </span>
          Passerelle
        </Link>
        <div className="flex items-center gap-4">
          <p className="hidden items-center gap-1.5 text-sm text-muted-foreground md:flex">
            <ShieldCheck className="size-4 text-success" aria-hidden="true" />
            Tu valides toujours avant l&apos;envoi
          </p>
          <a
            href={lienSupport()}
            title={EMAIL_SUPPORT}
            className="hidden text-sm font-semibold text-primary hover:underline sm:block"
          >
            Contact
          </a>
          <MenuCompte />
        </div>
      </div>
    </header>
  )
}
