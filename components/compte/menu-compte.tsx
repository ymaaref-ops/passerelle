'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, UserRound } from 'lucide-react'
import { EVENEMENT_COMPTE, seDeconnecter, sessionCourante, type Session } from '@/lib/compte'

export function MenuCompte() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)

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

  if (!session) {
    return (
      <Link
        href="/connexion"
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-semibold text-foreground hover:bg-muted"
      >
        <UserRound className="size-4" aria-hidden="true" />
        Se connecter
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Link
        href="/profil"
        title={session.email}
        className="inline-flex h-9 max-w-[14rem] items-center gap-1.5 rounded-full border border-border px-3 font-semibold text-foreground hover:bg-muted"
      >
        <UserRound className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{session.prenom ? `Mon profil · ${session.prenom}` : 'Mon profil'}</span>
      </Link>
      <button
        type="button"
        aria-label="Se déconnecter"
        onClick={() => {
          seDeconnecter()
          router.push('/')
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 font-semibold text-foreground hover:bg-muted"
      >
        <LogOut className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Se déconnecter</span>
      </button>
    </div>
  )
}
