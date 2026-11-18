import type { Metadata } from 'next'
import { DocumentsWorkspace } from '@/components/documents/documents-workspace'
import { STEP_COLORS } from '@/lib/step-colors'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Mes documents — Passerelle',
  description:
    'Dépose tes pièces justificatives une seule fois : on les vérifie, on les compare entre elles et on te signale tout de suite ce qui manque.',
}

export default function DocumentsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12">
      <header className="mb-8 max-w-2xl">
        <p className={cn('text-sm font-semibold', STEP_COLORS.blue.text)}>Étape 2 sur 6</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Mes documents
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          Dépose chaque pièce une seule fois. On les vérifie en quelques secondes et on te dit tout
          de suite si quelque chose cloche.
        </p>
      </header>
      <DocumentsWorkspace />
    </div>
  )
}
