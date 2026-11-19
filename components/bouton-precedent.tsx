import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Bouton « Précédent » commun à toutes les étapes du parcours. */
export function BoutonPrecedent({ href, label = 'Précédent', className }: { href: string; label?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-11 items-center gap-2 self-start rounded-full border border-border bg-card px-5 text-sm font-semibold text-primary outline-none transition-colors hover:bg-primary-soft focus-visible:ring-4 focus-visible:ring-ring/30',
        className,
      )}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {label}
    </Link>
  )
}
