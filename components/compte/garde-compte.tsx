'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { jetonValide, sessionDepuisLien, synchroniserCompte } from '@/lib/compte'

/** Pages accessibles sans compte. */
const PUBLIQUES = ['/', '/connexion', '/informations']

/** Toutes les étapes demandent d'être connecté : sinon on passe par la page de connexion. */
export function GardeCompte({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const publique = PUBLIQUES.includes(pathname)
  const [autorise, setAutorise] = useState(publique)

  useEffect(() => {
    let actif = true
    // Lien de confirmation d'e-mail : on connecte l'étudiant puis on l'emmène aux démarches.
    if (window.location.hash.includes('access_token=')) {
      sessionDepuisLien().then((r) => {
        if (actif && r === 'connecte') router.replace(publique ? '/demarrer' : pathname)
      })
      return () => {
        actif = false
      }
    }
    if (publique) {
      setAutorise(true)
      return
    }
    setAutorise(false)
    jetonValide().then(async (jeton) => {
      if (!actif) return
      if (!jeton) {
        router.replace(`/connexion?suite=${encodeURIComponent(pathname)}`)
        return
      }
      await synchroniserCompte().catch(() => undefined)
      if (actif) setAutorise(true)
    })
    return () => {
      actif = false
    }
  }, [pathname, publique, router])

  if (!autorise) {
    return <p className="mx-auto max-w-6xl px-4 py-12 text-muted-foreground sm:px-6 lg:px-10">Vérification de ton compte…</p>
  }
  return <>{children}</>
}
