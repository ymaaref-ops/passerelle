'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  FileText,
  Gift,
  Home,
  ListChecks,
  Search,
  ShieldCheck,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { MenuCompte, useSession } from '@/components/compte/menu-compte'
import { SiteHeader } from '@/components/site-header'
import { cn } from '@/lib/utils'

const MENU: { href: string; label: string; Icone: LucideIcon; actif?: string[] }[] = [
  { href: '/', label: 'Accueil', Icone: Home },
  { href: '/documents', label: 'Mes documents', Icone: FileText, actif: ['/situation', '/documents'] },
  { href: '/aides', label: 'Mes aides', Icone: Gift },
  { href: '/choix', label: 'Mes démarches', Icone: ListChecks, actif: ['/choix', '/validation'] },
  { href: '/agents', label: 'Suivi en direct', Icone: TrendingUp },
  { href: '/recherche-logement', label: 'Trouver un logement', Icone: Search },
  { href: '/profil', label: 'Mon profil', Icone: UserRound },
]

function estActif(pathname: string, item: (typeof MENU)[number]) {
  if (item.href === '/') return pathname === '/'
  return (item.actif ?? [item.href]).some((h) => pathname === h || pathname.startsWith(`${h}/`))
}

function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-xl text-xl font-extrabold tracking-tight text-primary outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
    >
      <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        P
      </span>
      Passerelle
    </Link>
  )
}

function BarreLaterale({ pathname }: { pathname: string }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 rounded-r-[2rem] bg-card px-4 py-7 shadow-carte lg:flex">
      <div className="px-2">
        <Logo />
      </div>
      <nav aria-label="Menu principal" className="flex flex-col gap-1.5">
        {MENU.map((item) => {
          const actif = estActif(pathname, item)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={actif ? 'page' : undefined}
              className={cn(
                'flex h-12 items-center gap-3 rounded-2xl px-4 text-[0.95rem] font-semibold outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ring/30',
                actif ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'text-foreground hover:bg-primary-soft',
              )}
            >
              <item.Icone className="size-5 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto flex flex-col items-center gap-2 rounded-3xl bg-primary-soft p-5 text-center">
        <ShieldCheck className="size-7 text-step-blue" aria-hidden="true" />
        <p className="font-bold text-foreground">Tu gardes la main</p>
        <p className="text-sm leading-snug text-muted-foreground">Rien n&apos;est envoyé sans ta validation.</p>
      </div>
    </aside>
  )
}

/** Menu en haut sur mobile et tablette (le menu latéral n'apparaît qu'en grand écran). */
function MenuMobile({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Menu principal" className="-mx-4 overflow-x-auto px-4 pb-1 lg:hidden">
      <ul className="flex w-max gap-2">
        {MENU.map((item) => {
          const actif = estActif(pathname, item)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={actif ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap',
                  actif ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground shadow-carte',
                )}
              >
                <item.Icone className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/**
 * Mise en page : menu latéral + barre du haut pour l'étudiant connecté,
 * en-tête simple pour la page d'accueil publique et la connexion.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const session = useSession()

  // Fenêtre de l'agent : plein écran, sans menu.
  if (pathname === '/fenetre-agent') return <main>{children}</main>

  const publique = pathname === '/connexion' || (pathname === '/' && session === null)
  if (pathname === '/' && session === undefined) return <main className="min-h-dvh">{children}</main>
  if (publique) {
    return (
      <>
        <SiteHeader />
        <main>{children}</main>
      </>
    )
  }

  return (
    <div className="flex min-h-dvh">
      <BarreLaterale pathname={pathname} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-col gap-3 px-4 pt-4 sm:px-6 lg:px-10 lg:pt-6">
          <div className="flex items-center justify-between gap-3">
            <div className="lg:hidden">
              <Logo />
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-4">
              <Link
                href="/agents"
                aria-label="Suivi de tes démarches"
                className="flex size-11 items-center justify-center rounded-full text-foreground outline-none hover:bg-card/70 focus-visible:ring-4 focus-visible:ring-ring/30"
              >
                <Bell className="size-5" aria-hidden="true" />
              </Link>
              <MenuCompte />
            </div>
          </div>
          <MenuMobile pathname={pathname} />
        </header>
        <main className="flex-1 pb-10">{children}</main>
      </div>
    </div>
  )
}
