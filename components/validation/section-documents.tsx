'use client'

import { Download, FileText } from 'lucide-react'
import { DOCUMENTS_PRETS, documentPdf, type DocumentPret } from '@/lib/validation-documents'
import { useProfilCourant, type ProfilCourant } from '@/lib/profil-courant'

function telecharger(document: DocumentPret, profil: ProfilCourant) {
  const blob = new Blob([documentPdf(document, profil) as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const lien = window.document.createElement('a')
  lien.href = url
  lien.download = document.fichier
  lien.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function SectionDocuments() {
  const profil = useProfilCourant()
  return (
    <section aria-labelledby="titre-documents" className="rounded-3xl bg-card shadow-carte p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <FileText className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h2 id="titre-documents" className="text-xl font-bold leading-snug text-foreground">
            Tes documents prêts
          </h2>
          <p className="text-sm text-muted-foreground">Générés par Passerelle pour ton dossier de prêt.</p>
        </div>
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        {DOCUMENTS_PRETS.map((document) => (
          <li
            key={document.id}
            className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-background p-4"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <FileText className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-bold leading-snug text-foreground">{document.titre}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{document.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">{document.fichier}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={!profil}
              onClick={() => profil && telecharger(document, profil)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-semibold text-primary outline-none transition-colors hover:bg-primary-soft focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              <Download className="size-4" aria-hidden="true" />
              Télécharger
              <span className="sr-only"> : {document.titre}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
