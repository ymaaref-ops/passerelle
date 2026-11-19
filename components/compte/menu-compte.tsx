'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import { EVENEMENT_COMPTE, seDeconnecter, sessionCourante, type Session } from '@/lib/compte'

/** Session courante, mise à jour à la connexion et à la déconnexion. `undefined` tant qu'elle n'est pas lue. */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    const maj = () => setSession(sessionCourante())
    maj()
    window.addEventListener(EVENEMENT_COMPTE, maj)
    window.addEventListener('storage', maj)
    return () => {
      window.removeEventListener(EVENEMENT_COMPTE, maj)
      window.removeEventListener('storage', maj)
    }
  }, [])
  return session
}

export function initiales(session: Session): string {
  const base = (session.prenom || session.email.split('@')[0] || '?').trim()
  const mots = base.split(/[\s._-]+/).filter(Boolean)
  return ((mots[0]?.[0] ?? '') + (mots[1]?.[0] ?? mots[0]?.[1] ?? '')).toUpperCase()
}

/** Avatar avec le prénom ; ouvre un petit menu (profil, déconnexion). */
export function MenuCompte() {
  const router = useRouter()
  const session = useSession()
  const [ouvert, setOuvert] = useState(false)
  const zone = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ouvert) return
    const fermer = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !zone.current?.contains(e.target as Node)) setOuvert(false)
    }
    document.addEventListener('mousedown', fermer)
    document.addEventListener('keydown', fermer)
    return () => {
      document.removeEventListener('mousedown', fermer)
      document.removeEventListener('keydown', fermer)
    }
  }, [ouvert])

  if (session === undefined) return <span className="size-11" aria-hidden="true" />

  if (!session) {
    return (
      <Link
        href="/connexion"
        className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        <UserRound className="size-4" aria-hidden="true" />
        Se connecter
      </Link>
    )
  }

  return (
    <div ref={zone} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={ouvert}
        onClick={() => setOuvert((o) => !o)}
        title={session.email}
        className="flex items-center gap-3 rounded-full py-1 pr-2 pl-1 outline-none hover:bg-card/70 focus-visible:ring-4 focus-visible:ring-ring/30"
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {initiales(session)}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm font-semibold text-foreground sm:block">
          {session.prenom || session.email}
        </span>
        <ChevronDown className="size-4 text-foreground" aria-hidden="true" />
      </button>
      {ouvert && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-carte"
        >
          <p className="truncate px-3 py-2 text-xs text-muted-foreground">{session.email}</p>
          <Link
            role="menuitem"
            href="/profil"
            onClick={() => setOuvert(false)}
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            <UserRound className="size-4" aria-hidden="true" />
            Mon profil
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOuvert(false)
              seDeconnecter()
              router.push('/')
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-muted"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}
