'use client'

import { useState } from 'react'
import {
  Camera,
  FileText,
  GraduationCap,
  Home,
  IdCard,
  Loader2,
  Receipt,
  RefreshCw,
  ScanText,
  UploadCloud,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatutPastille, type StatutDocumentUI } from '@/components/documents/statut-pastille'
import type { DefinitionDocument, DocumentRequis } from '@/lib/documents-demo'
import { STEP_COLORS } from '@/lib/step-colors'
import { cn } from '@/lib/utils'

const ICONES: Record<DocumentRequis, typeof FileText> = {
  identite: IdCard,
  bail: Home,
  certificat_scolarite: GraduationCap,
  avis_imposition: FileText,
  fiche_paie: Receipt,
  contrat_alternance: FileText,
}

interface DocumentCardProps {
  definition: DefinitionDocument
  statut: StatutDocumentUI
  nomFichier: string | null
  extrait: string
  probleme: { message: string; detail?: string } | null
  onChoisir: () => void
  onPhoto: () => void
  onDepot: (fichier: File) => void
}

export function DocumentCard({
  definition,
  statut,
  nomFichier,
  extrait,
  probleme,
  onChoisir,
  onPhoto,
  onDepot,
}: DocumentCardProps) {
  const [survol, setSurvol] = useState(false)
  const Icon = ICONES[definition.type]
  const bleu = STEP_COLORS.blue
  const enAnalyse = statut === 'analyse'
  const depose = statut === 'pret' || statut === 'verifie' || statut === 'probleme'

  return (
    <li
      className={cn(
        'flex flex-col gap-4 rounded-3xl border bg-card p-5 transition-colors sm:p-6',
        statut === 'probleme' && 'border-danger/50 bg-danger-soft',
        statut === 'verifie' && 'border-success/30',
        (statut === 'manquant' || enAnalyse) && 'border-border',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-2xl text-primary-foreground',
            bleu.solid,
          )}
        >
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-foreground">
            {definition.titre}
            {definition.facultatif && (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Facultatif
              </span>
            )}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{definition.description}</p>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          if (enAnalyse) return
          e.preventDefault()
          setSurvol(true)
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          e.preventDefault()
          setSurvol(false)
          const fichier = e.dataTransfer.files[0]
          if (fichier && !enAnalyse) onDepot(fichier)
        }}
        className={cn(
          'rounded-2xl border-2 border-dashed p-4 text-center transition-colors',
          survol ? 'border-step-blue bg-step-blue-soft' : 'border-step-blue-border bg-step-blue-soft/50',
        )}
      >
        {enAnalyse ? (
          <p
            role="status"
            className="flex items-center justify-center gap-2 py-3 font-semibold text-step-blue"
          >
            <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" />
            Analyse en cours…
          </p>
        ) : depose ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-left">
            <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
              <FileText className="size-4 shrink-0 text-step-blue" aria-hidden="true" />
              <span className="truncate">{nomFichier}</span>
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={onChoisir} className="text-step-blue">
              <RefreshCw aria-hidden="true" />
              Remplacer
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2">
            <UploadCloud className="size-8 text-step-blue" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              <span className="hidden md:inline">Glisse ton fichier ici, prends-le en photo, ou</span>
              <span className="md:hidden">Ajoute ton document :</span>
            </p>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                onClick={onPhoto}
                className={cn('h-11 rounded-xl px-5 text-base font-semibold', bleu.solid)}
              >
                <Camera aria-hidden="true" />
                Prendre en photo
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onChoisir}
                className="h-11 rounded-xl px-5 text-base font-semibold"
              >
                Choisir un fichier
              </Button>
            </div>
          </div>
        )}
      </div>

      {!enAnalyse && (
        <div aria-live="polite" className="flex flex-col gap-2">
          <div>
            <StatutPastille statut={statut} />
          </div>
          {statut === 'verifie' && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <ScanText className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              <span>Lu automatiquement : {extrait}</span>
            </p>
          )}
          {statut === 'probleme' && probleme && (
            <div className="text-sm leading-relaxed">
              <p className="font-semibold text-danger">{probleme.message}</p>
              {probleme.detail && <p className="mt-0.5 text-foreground/80">{probleme.detail}</p>}
            </div>
          )}
        </div>
      )}
    </li>
  )
}
