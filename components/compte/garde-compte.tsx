'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { jetonValide } from '@/lib/compte'

/** Pages accessibles sans compte. */
const PUBLIQUES = ['/', '/connexion']

/** Toutes les étapes demandent d'être connecté : sinon on passe par la page de connexion. */
export function GardeCompte({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const publique = PUBLIQUES.includes(pathname)
  const [autorise, setAutorise] = useState(publique)

  useEffect(() => {
    if (publique) {
      setAutorise(true)
      return
    }
    let actif = true
    setAutorise(false)
    jetonValide().then((jeton) => {
      if (!actif) return
      if (jeton) setAutorise(true)
      else router.replace(`/connexion?suite=${encodeURIComponent(pathname)}`)
    })
    return () => {
      actif = false
    }
  }, [pathname, publique, router])

  if (!autorise) {
    return <p className="mx-auto max-w-5xl px-4 py-12 text-muted-foreground sm:px-6">Vérification de ton compte…</p>
  }
  return <>{children}</>
}
