import type { Metadata } from 'next'
import { Suspense } from 'react'
import { FormulaireConnexion } from '@/components/compte/formulaire-connexion'

export const metadata: Metadata = {
  title: 'Se connecter — Passerelle',
  description: 'Connecte-toi ou crée ton compte Passerelle pour retrouver tes documents et tes démarches.',
}

export default function ConnexionPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
      <Suspense fallback={null}>
        <FormulaireConnexion />
      </Suspense>
    </div>
  )
}
