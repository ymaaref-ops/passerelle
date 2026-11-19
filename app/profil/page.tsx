import type { Metadata } from 'next'
import { ProfilEtudiant } from '@/components/compte/profil-etudiant'

export const metadata: Metadata = {
  title: 'Mon profil — Passerelle',
  description: 'Tes informations, tes documents gardés et la déconnexion.',
}

export default function ProfilPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10">
      <div className="max-w-3xl">
        <ProfilEtudiant />
      </div>
    </div>
  )
}
