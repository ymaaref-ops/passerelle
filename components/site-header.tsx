import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card">
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
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-success" aria-hidden="true" />
          <span className="hidden sm:inline">Tu valides toujours avant l&apos;envoi</span>
          <span className="sm:hidden">Tu valides tout</span>
        </p>
      </div>
    </header>
  )
}
