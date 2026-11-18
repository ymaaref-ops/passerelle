'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { ControleCroise } from '@/components/documents/controle-croise'
import { DocumentCard } from '@/components/documents/document-card'
import type { StatutDocumentUI } from '@/components/documents/statut-pastille'
import {
  DOCUMENTS_REQUIS,
  DUREE_ANALYSE_MS,
  extraitDocument,
  getControles,
  verifierFichier,
  type DocumentRequis,
} from '@/lib/documents-demo'
import { marquerDocumentsValides } from '@/lib/session'
import { cn } from '@/lib/utils'

interface EtatDocument {
  statut: StatutDocumentUI
  nomFichier: string | null
  message: string | null
  /** Nombre de dépôts valides, pour savoir si l'avis a déjà été remplacé. */
  valides: number
}

const ETAT_INITIAL: Record<DocumentRequis, EtatDocument> = {
  identite: { statut: 'manquant', nomFichier: null, message: null, valides: 0 },
  bail: { statut: 'manquant', nomFichier: null, message: null, valides: 0 },
  certificat_scolarite: { statut: 'manquant', nomFichier: null, message: null, valides: 0 },
  avis_imposition: { statut: 'manquant', nomFichier: null, message: null, valides: 0 },
}

// Délais cumulés (ms) avant que chaque vérification du contrôle croisé soit résolue.
const DELAIS_CONTROLES = [1100, 2200, 3700]

export function DocumentsWorkspace() {
  const [etats, setEtats] = useState(ETAT_INITIAL)
  const [controlesResolus, setControlesResolus] = useState(0)
  const timers = useRef<number[]>([])
  const inputFichier = useRef<HTMLInputElement>(null)
  const inputPhoto = useRef<HTMLInputElement>(null)
  const cible = useRef<DocumentRequis | null>(null)
  const sectionControle = useRef<HTMLElement>(null)

  useEffect(() => {
    const enCours = timers.current
    return () => enCours.forEach((id) => window.clearTimeout(id))
  }, [])

  const tousAnalyses = DOCUMENTS_REQUIS.every((d) => etats[d.type].statut === 'verifie')
  const avisValides = etats.avis_imposition.valides
  const controles = getControles(avisValides)
  const controleFini = tousAnalyses && controlesResolus >= controles.length
  const controleEchoue = controleFini ? controles.find((c) => !c.ok) : undefined
  // On ne passe aux aides que si les 4 documents sont vérifiés et que le contrôle croisé est bon.
  const dossierComplet = controleFini && !controleEchoue

  useEffect(() => {
    marquerDocumentsValides(dossierComplet)
  }, [dossierComplet])

  useEffect(() => {
    if (!tousAnalyses) return
    const ids = DELAIS_CONTROLES.map((delai, i) =>
      window.setTimeout(() => setControlesResolus(i + 1), delai),
    )
    return () => ids.forEach((id) => window.clearTimeout(id))
  }, [tousAnalyses, avisValides])

  useEffect(() => {
    if (!tousAnalyses) return
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    sectionControle.current?.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'center' })
  }, [tousAnalyses, controleEchoue])

  function envoyer(type: DocumentRequis, fichier: File) {
    if (etats[type].statut === 'analyse') return
    setControlesResolus(0)
    setEtats((prev) => ({
      ...prev,
      [type]: { ...prev[type], statut: 'analyse', nomFichier: fichier.name, message: null },
    }))
    const id = window.setTimeout(() => {
      const erreur = verifierFichier(fichier)
      setEtats((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          statut: erreur ? 'probleme' : 'verifie',
          message: erreur,
          valides: erreur ? prev[type].valides : prev[type].valides + 1,
        },
      }))
    }, DUREE_ANALYSE_MS)
    timers.current.push(id)
  }

  function choisirFichier(type: DocumentRequis) {
    cible.current = type
    inputFichier.current?.click()
  }

  function prendrePhoto(type: DocumentRequis) {
    cible.current = type
    inputPhoto.current?.click()
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    const type = cible.current
    e.target.value = ''
    if (fichier && type) envoyer(type, fichier)
  }

  function affichage(type: DocumentRequis) {
    const etat = etats[type]
    const echec = controleEchoue?.document === type ? controleEchoue : undefined
    if (echec) {
      return {
        statut: 'probleme' as const,
        probleme: { message: echec.erreur ?? 'Problème détecté', detail: echec.detail },
      }
    }
    return {
      statut: etat.statut,
      probleme: etat.message ? { message: etat.message } : null,
    }
  }

  const nbVerifies = DOCUMENTS_REQUIS.filter((d) => affichage(d.type).statut === 'verifie').length
  const pluriel = nbVerifies > 1 ? 's' : ''

  return (
    <>
      <section
        aria-label="Résumé de tes documents"
        className="flex flex-col gap-5 rounded-3xl border border-step-blue-border bg-step-blue-soft p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div className="min-w-0 flex-1">
          <p aria-live="polite" className="text-xl font-bold text-foreground">
            {nbVerifies} document{pluriel} sur {DOCUMENTS_REQUIS.length} vérifié{pluriel}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {tousAnalyses && !controleFini
              ? 'Contrôle croisé en cours…'
              : 'Dépose chaque pièce pour que nos agents puissent préparer tes dossiers.'}
          </p>
          <ul className="mt-3 flex gap-2" aria-hidden="true">
            {DOCUMENTS_REQUIS.map((d) => {
              const { statut } = affichage(d.type)
              return (
                <li
                  key={d.type}
                  className={cn(
                    'h-2 flex-1 rounded-full transition-colors duration-500',
                    statut === 'verifie' && 'bg-success',
                    statut === 'probleme' && 'bg-destructive',
                    statut === 'analyse' && 'bg-step-blue motion-safe:animate-pulse',
                    statut === 'manquant' && 'bg-step-blue-border',
                  )}
                />
              )
            })}
          </ul>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
          {dossierComplet ? (
            <Link
              href="/aides"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'h-12 gap-2 rounded-2xl px-6 text-base font-semibold',
              )}
            >
              Voir mes aides
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          ) : (
            <>
              <button
                type="button"
                disabled
                aria-describedby="aide-voir-aides"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'h-12 cursor-not-allowed gap-2 rounded-2xl bg-muted px-6 text-base font-semibold text-muted-foreground',
                )}
              >
                Voir mes aides
                <ArrowRight className="size-5" aria-hidden="true" />
              </button>
              <p id="aide-voir-aides" className="text-sm text-muted-foreground sm:text-right">
                {controleEchoue
                  ? 'Remplace le document signalé pour continuer.'
                  : tousAnalyses
                    ? 'Contrôle croisé en cours…'
                    : `Dépose tes ${DOCUMENTS_REQUIS.length} documents pour continuer.`}
              </p>
            </>
          )}
        </div>
      </section>

      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {DOCUMENTS_REQUIS.map((definition) => {
          const etat = etats[definition.type]
          const { statut, probleme } = affichage(definition.type)
          return (
            <DocumentCard
              key={definition.type}
              definition={definition}
              statut={statut}
              nomFichier={etat.nomFichier}
              extrait={extraitDocument(definition.type, avisValides)}
              probleme={probleme}
              onChoisir={() => choisirFichier(definition.type)}
              onPhoto={() => prendrePhoto(definition.type)}
              onDepot={(fichier) => envoyer(definition.type, fichier)}
            />
          )
        })}
      </ul>

      {tousAnalyses && (
        <div className="mt-6">
          <ControleCroise
            ref={sectionControle}
            controles={controles}
            resolus={controlesResolus}
            onRemplacer={(controle) => {
              if (controle.document) choisirFichier(controle.document)
            }}
          />
        </div>
      )}

      <input
        ref={inputFichier}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={onInputChange}
      />
      <input
        ref={inputPhoto}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={onInputChange}
      />
    </>
  )
}
