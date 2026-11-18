'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Send, ShieldCheck } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { CameraDialog } from '@/components/documents/camera-dialog'
import { DocumentCard } from '@/components/documents/document-card'
import type { StatutDocumentUI } from '@/components/documents/statut-pastille'
import { etudiantCourant } from '@/lib/data'
import { DOCUMENTS_REQUIS, verifierFichier, type DocumentRequis } from '@/lib/documents-demo'
import { deposerDocuments, lireEtatEtudiant, type DocumentN8n } from '@/lib/n8n'
import { marquerDocumentsValides } from '@/lib/session'
import { cn } from '@/lib/utils'

/** Type de document dans l'interface → type renvoyé par la lecture IA (workflow 1). */
const TYPE_N8N: Record<DocumentRequis, string> = {
  identite: 'piece_identite',
  bail: 'bail',
  certificat_scolarite: 'certificat_scolarite',
  avis_imposition: 'avis_imposition',
}

/** Temps maximum d'attente de la lecture des documents. */
const ATTENTE_MAX_MS = 4 * 60 * 1000
const INTERVALLE_MS = 4000

type Phase = 'saisie' | 'analyse' | 'resultat'

const VIDE: Record<DocumentRequis, File | null> = {
  identite: null,
  bail: null,
  certificat_scolarite: null,
  avis_imposition: null,
}

function texte(v: unknown): string {
  return v === null || v === undefined || v === '' ? '?' : String(v)
}

/** Résumé en une ligne de ce que l'IA a lu sur le document. */
function extraitLu(type: DocumentRequis, c: Record<string, unknown>): string {
  switch (type) {
    case 'identite':
      return `${texte(c.prenom)} ${texte(c.nom)} · né(e) le ${texte(c.date_naissance)}`
    case 'bail':
      return `${texte(c.adresse_logement)} · loyer ${texte(c.loyer_hors_charges)} € + ${texte(c.charges)} € de charges`
    case 'certificat_scolarite':
      return `${texte(c.etablissement)} · année ${texte(c.annee_universitaire)}`
    case 'avis_imposition':
      return `Avis ${texte(c.annee_avis)} sur les revenus ${texte(c.annee_revenus)} · ${texte(c.declarants)}`
  }
}

export function DocumentsWorkspace() {
  const [fichiers, setFichiers] = useState(VIDE)
  const [erreursFichier, setErreursFichier] = useState<Partial<Record<DocumentRequis, string>>>({})
  const [ressources, setRessources] = useState('')
  const [boursier, setBoursier] = useState<'oui' | 'non' | ''>('')
  const [accord, setAccord] = useState(false)
  const [phase, setPhase] = useState<Phase>('saisie')
  const [erreur, setErreur] = useState<string | null>(null)
  const [lus, setLus] = useState<DocumentN8n[]>([])
  const [cameraPour, setCameraPour] = useState<DocumentRequis | null>(null)
  const inputFichier = useRef<HTMLInputElement>(null)
  const inputPhoto = useRef<HTMLInputElement>(null)
  const cible = useRef<DocumentRequis | null>(null)
  const sondage = useRef<number | null>(null)

  useEffect(() => () => {
    if (sondage.current) window.clearTimeout(sondage.current)
  }, [])

  // Document lu par l'IA pour chaque type attendu.
  const parType = (type: DocumentRequis) => lus.find((d) => d.type === TYPE_N8N[type])
  const bloquantes = (d?: DocumentN8n) => (d?.anomalies ?? []).filter((a) => a.gravite === 'bloquante')

  const tousDeposes = DOCUMENTS_REQUIS.every((d) => fichiers[d.type])
  const ressourcesOk = ressources.trim() !== '' && !Number.isNaN(Number(ressources))
  const peutEnvoyer = tousDeposes && ressourcesOk && boursier !== '' && accord && phase === 'saisie'

  const dossierComplet =
    phase === 'resultat' &&
    DOCUMENTS_REQUIS.every((d) => {
      const lu = parType(d.type)
      return lu && lu.statut !== 'rejete' && bloquantes(lu).length === 0
    })

  useEffect(() => {
    marquerDocumentsValides(dossierComplet)
  }, [dossierComplet])

  function ajouter(type: DocumentRequis, fichier: File) {
    if (phase === 'analyse') return
    const probleme = verifierFichier(fichier)
    setErreursFichier((prev) => ({ ...prev, [type]: probleme ?? undefined }))
    if (probleme) return
    setFichiers((prev) => ({ ...prev, [type]: fichier }))
    // Un document changé : il faut renvoyer le dossier pour qu'il soit relu.
    if (phase === 'resultat') {
      setPhase('saisie')
      setLus([])
    }
  }

  function choisirFichier(type: DocumentRequis) {
    cible.current = type
    inputFichier.current?.click()
  }

  function prendrePhoto(type: DocumentRequis) {
    cible.current = type
    setCameraPour(type)
  }

  function cameraIndisponible() {
    setCameraPour(null)
    inputPhoto.current?.click()
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    const type = cible.current
    e.target.value = ''
    if (fichier && type) ajouter(type, fichier)
  }

  async function envoyer() {
    setErreur(null)
    setPhase('analyse')
    setLus([])
    try {
      const donnees = new FormData()
      donnees.append('consentement', 'true')
      donnees.append('prenom', etudiantCourant.prenom)
      donnees.append('nom', etudiantCourant.nom)
      donnees.append('aides', 'apl')
      donnees.append('ressources_12_mois', String(Number(ressources)))
      donnees.append('boursier', boursier === 'oui' ? 'true' : 'false')
      for (const d of DOCUMENTS_REQUIS) {
        const f = fichiers[d.type]
        if (f) donnees.append('photo', f, f.name)
      }
      const etudiantId = await deposerDocuments(donnees)
      attendreLecture(etudiantId, Date.now())
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Tes documents n'ont pas pu être envoyés.")
      setPhase('saisie')
    }
  }

  // Interroge n8n jusqu'à ce que les documents soient lus et le contrôle croisé fait.
  function attendreLecture(etudiantId: string, debut: number) {
    sondage.current = window.setTimeout(async () => {
      try {
        const etat = await lireEtatEtudiant(etudiantId)
        const documents = etat.documents ?? []
        const controleFait =
          documents.length > 0 && documents.every((d) => d.statut === 'verifie' || d.statut === 'rejete')
        if (controleFait || (etat.demarches?.length ?? 0) > 0) {
          setLus(documents)
          setPhase('resultat')
          return
        }
      } catch {
        // On réessaie au prochain passage.
      }
      if (Date.now() - debut > ATTENTE_MAX_MS) {
        setErreur("La lecture de tes documents prend trop de temps. Réessaie dans un instant.")
        setPhase('saisie')
        return
      }
      attendreLecture(etudiantId, debut)
    }, INTERVALLE_MS)
  }

  function affichage(type: DocumentRequis): {
    statut: StatutDocumentUI
    extrait: string
    probleme: { message: string; detail?: string } | null
  } {
    const erreurFichier = erreursFichier[type]
    if (erreurFichier) return { statut: 'probleme', extrait: '', probleme: { message: erreurFichier } }
    if (!fichiers[type]) return { statut: 'manquant', extrait: '', probleme: null }
    if (phase === 'analyse') return { statut: 'analyse', extrait: '', probleme: null }
    if (phase === 'saisie') return { statut: 'pret', extrait: '', probleme: null }

    const lu = parType(type)
    if (!lu) {
      return {
        statut: 'probleme',
        extrait: '',
        probleme: {
          message: "On n'a pas reconnu ce document",
          detail: 'Vérifie que c’est le bon document et que la photo est nette, puis remplace-le.',
        },
      }
    }
    const bloque = bloquantes(lu)
    if (lu.statut === 'rejete' || bloque.length > 0) {
      return {
        statut: 'probleme',
        extrait: '',
        probleme: { message: bloque[0]?.message ?? 'Ce document pose problème.', detail: bloque[1]?.message },
      }
    }
    return { statut: 'verifie', extrait: extraitLu(type, lu.champs_extraits ?? {}), probleme: null }
  }

  const nbVerifies = DOCUMENTS_REQUIS.filter((d) => affichage(d.type).statut === 'verifie').length
  const nbDeposes = DOCUMENTS_REQUIS.filter((d) => fichiers[d.type]).length
  const pluriel = (n: number) => (n > 1 ? 's' : '')
  const aVerifier = lus.flatMap((d) => (d.anomalies ?? []).filter((a) => a.gravite === 'a_verifier'))

  return (
    <>
      <section
        aria-label="Résumé de tes documents"
        className="flex flex-col gap-5 rounded-3xl border border-step-blue-border bg-step-blue-soft p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div className="min-w-0 flex-1">
          <p aria-live="polite" className="text-xl font-bold text-foreground">
            {phase === 'saisie'
              ? `${nbDeposes} document${pluriel(nbDeposes)} sur ${DOCUMENTS_REQUIS.length} ajouté${pluriel(nbDeposes)}`
              : phase === 'analyse'
                ? 'Lecture de tes documents en cours…'
                : `${nbVerifies} document${pluriel(nbVerifies)} sur ${DOCUMENTS_REQUIS.length} vérifié${pluriel(nbVerifies)}`}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {phase === 'analyse'
              ? 'Notre IA lit chaque document et les compare entre eux. Ça prend environ une minute.'
              : 'Dépose chaque pièce pour que nos agents puissent préparer tes dossiers.'}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
          {dossierComplet ? (
            <Link
              href="/aides"
              className={cn(buttonVariants({ size: 'lg' }), 'h-12 gap-2 rounded-2xl px-6 text-base font-semibold')}
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
                {phase === 'resultat'
                  ? 'Remplace le document signalé, puis renvoie ton dossier.'
                  : phase === 'analyse'
                    ? 'Vérification en cours…'
                    : 'Envoie tes 4 documents pour continuer.'}
              </p>
            </>
          )}
        </div>
      </section>

      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {DOCUMENTS_REQUIS.map((definition) => {
          const { statut, extrait, probleme } = affichage(definition.type)
          return (
            <DocumentCard
              key={definition.type}
              definition={definition}
              statut={statut}
              nomFichier={fichiers[definition.type]?.name ?? null}
              extrait={extrait}
              probleme={probleme}
              onChoisir={() => choisirFichier(definition.type)}
              onPhoto={() => prendrePhoto(definition.type)}
              onDepot={(fichier) => ajouter(definition.type, fichier)}
            />
          )
        })}
      </ul>

      {phase === 'resultat' && (
        <section
          aria-labelledby="titre-controle"
          className={cn(
            'mt-6 rounded-3xl border-2 p-5 sm:p-6',
            dossierComplet ? 'border-success/50 bg-success-soft' : 'border-destructive bg-danger-soft',
          )}
        >
          <h2 id="titre-controle" className="flex items-center gap-2 text-xl font-bold text-foreground">
            {dossierComplet ? (
              <ShieldCheck className="size-6 text-success" aria-hidden="true" />
            ) : (
              <AlertTriangle className="size-6 text-danger" aria-hidden="true" />
            )}
            Contrôle croisé
          </h2>
          <p className="mt-1 text-muted-foreground">
            {dossierComplet
              ? 'Tes documents sont cohérents entre eux : tu peux voir tes aides.'
              : 'Un document pose problème. Corrige-le puis renvoie ton dossier.'}
          </p>
          {aVerifier.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1 text-sm">
              {aVerifier.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-foreground">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-step-orange" aria-hidden="true" />
                  {a.message}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {phase !== 'resultat' && (
        <section
          aria-labelledby="titre-envoi"
          className="mt-6 flex flex-col gap-5 rounded-3xl border border-border bg-card p-5 sm:p-6"
        >
          <div>
            <h2 id="titre-envoi" className="text-xl font-bold text-foreground">
              Deux questions pour ta simulation d&apos;APL
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              La CAF les demande et elles ne figurent pas sur tes documents.
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="font-medium text-foreground">Tes revenus des 12 derniers mois (en €)</span>
            <span className="text-sm text-muted-foreground">Salaires, alternance, job étudiant… mets 0 si tu n&apos;en as pas.</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={ressources}
              onChange={(e) => setRessources(e.target.value)}
              disabled={phase === 'analyse'}
              className="h-12 max-w-xs rounded-xl border border-border bg-background px-4 text-base outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
            />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="font-medium text-foreground">Es-tu boursier ou boursière cette année ?</legend>
            <div className="flex gap-3">
              {(['oui', 'non'] as const).map((v) => (
                <label
                  key={v}
                  className={cn(
                    'flex h-11 cursor-pointer items-center gap-2 rounded-xl border px-4',
                    boursier === v ? 'border-step-blue bg-step-blue-soft' : 'border-border',
                  )}
                >
                  <input
                    type="radio"
                    name="boursier"
                    value={v}
                    checked={boursier === v}
                    onChange={() => setBoursier(v)}
                    disabled={phase === 'analyse'}
                    className="accent-step-blue"
                  />
                  {v === 'oui' ? 'Oui' : 'Non'}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={accord}
              onChange={(e) => setAccord(e.target.checked)}
              disabled={phase === 'analyse'}
              className="mt-1 size-5 shrink-0 accent-step-blue"
            />
            <span className="leading-relaxed text-foreground">
              J&apos;accepte que Passerelle analyse mes documents. Les photos sont gardées 30 jours au
              maximum, dans un espace privé.
            </span>
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={envoyer}
              disabled={!peutEnvoyer}
              className={cn(
                buttonVariants({ size: 'lg' }),
                'h-12 gap-2 rounded-2xl px-6 text-base font-semibold disabled:cursor-not-allowed',
              )}
            >
              {phase === 'analyse' ? (
                <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" />
              ) : (
                <Send className="size-5" aria-hidden="true" />
              )}
              {phase === 'analyse' ? 'Vérification en cours…' : 'Envoyer mes documents'}
            </button>
            {!peutEnvoyer && phase === 'saisie' && (
              <p className="text-sm text-muted-foreground">
                {!tousDeposes
                  ? 'Ajoute tes 4 documents.'
                  : !ressourcesOk || boursier === ''
                    ? 'Réponds aux deux questions.'
                    : 'Coche la case pour accepter l’analyse.'}
              </p>
            )}
          </div>
          {erreur && (
            <p role="alert" className="text-sm font-medium text-danger">
              {erreur}
            </p>
          )}
        </section>
      )}

      {dossierComplet && (
        <p className="mt-4 flex items-center gap-2 font-semibold text-success">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          Tes 4 documents sont vérifiés.
        </p>
      )}

      <CameraDialog
        titre={cameraPour ? (DOCUMENTS_REQUIS.find((d) => d.type === cameraPour)?.titre ?? null) : null}
        onPhoto={(fichier) => {
          if (cameraPour) ajouter(cameraPour, fichier)
        }}
        onFermer={() => setCameraPour(null)}
        onIndisponible={cameraIndisponible}
      />

      <input
        ref={inputFichier}
        type="file"
        accept="image/*"
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
