import type { Metadata } from 'next'
import { ProfilEtudiant } from '@/components/compte/profil-etudiant'

export const metadata: Metadata = {
  title: 'Mon profil — Passerelle',
  description: 'Tes informations, tes documents gardés et la déconnexion.',
}

export default function ProfilPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <ProfilEtudiant />
    </div>
  )
}
