'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { documentsValides } from '@/lib/session'

/** Affiche la page seulement si tous les documents ont été déposés et vérifiés, sinon renvoie vers Documents. */
export function GardeDocuments({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [autorise, setAutorise] = useState(false)

  useEffect(() => {
    if (documentsValides()) setAutorise(true)
    else router.replace('/documents')
  }, [router])

  if (!autorise) {
    return (
      <p className="mx-auto max-w-5xl px-4 py-12 text-muted-foreground sm:px-6">
        Vérification de tes documents…
      </p>
    )
  }
  return <>{children}</>
}
