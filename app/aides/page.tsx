import type { Metadata } from 'next'
import { BoutonPrecedent } from '@/components/bouton-precedent'
import { AidesPersonnalisees } from '@/components/aides/aides-personnalisees'
import { GardeDocuments } from '@/components/garde-documents'

export const metadata: Metadata = {
  title: 'Tes aides — Passerelle',
  description:
    'Découvre les aides étudiantes auxquelles tu as droit : APL, prime d’activité, prêts étudiants, bourse CROUS, avec les conditions en clair.',
}

export default function AidesPage() {
  return (
    <GardeDocuments>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12">
        <BoutonPrecedent href="/documents" label="Précédent : tes documents" className="mb-6" />
        <AidesPersonnalisees />
      </div>
    </GardeDocuments>
  )
}
