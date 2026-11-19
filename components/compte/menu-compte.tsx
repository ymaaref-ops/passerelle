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
      <span className="hidden max-w-[14rem] truncate text-muted-foreground sm:inline" title={session.email}>
        {session.prenom ? `Bonjour ${session.prenom}` : session.email}
      </span>
      <button
        type="button"
        onClick={() => {
          seDeconnecter()
          router.push('/')
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 font-semibold text-foreground hover:bg-muted"
      >
        <LogOut className="size-4" aria-hidden="true" />
        Se déconnecter
      </button>
    </div>
  )
}
