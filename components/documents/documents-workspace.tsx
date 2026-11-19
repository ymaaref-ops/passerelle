'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Send, ShieldCheck } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { CameraDialog } from '@/components/documents/camera-dialog'
import { BoutonPrecedent } from '@/components/bouton-precedent'
import { DocumentCard } from '@/components/documents/document-card'
import type { StatutDocumentUI } from '@/components/documents/statut-pastille'
import { documentsPour, verifierFichier, type DefinitionDocument, type DocumentRequis } from '@/lib/documents-demo'
import { deposerDocuments, lireEtatEtudiant, setEtudiantId, type DocumentN8n } from '@/lib/n8n'
import { pdfVersImage } from '@/lib/pdf-en-image'
import { lierDossier, lireMonCompte, lirePhotos, photoVersFichier, sessionCourante } from '@/lib/compte'
import { lireSituation, marquerDocumentsValides, type Situation } from '@/lib/session'
import { cn } from '@/lib/utils'

/** Type de document dans l'interface → type renvoyé par la lecture IA (workflow 1). */
const TYPE_N8N: Record<DocumentRequis, string> = {
  identite: 'piece_identite',
  bail: 'bail',
  certificat_scolarite: 'certificat_scolarite',
  avis_imposition: 'avis_imposition',
  fiche_paie: 'fiche_paie',
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
  fiche_paie: null,
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
    case 'fiche_paie':
      return `${texte(c.employeur)} · ${texte(c.periode)} · net ${texte(c.net_a_payer)} €`
  }
}

export function DocumentsWorkspace() {
  const [fichiers, setFichiers] = useState(VIDE)
  const [erreursFichier, setErreursFichier] = useState<Partial<Record<DocumentRequis, string>>>({})
  const router = useRouter()
  const [situation, setSituation] = useState<Situation | null>(null)
  const [accord, setAccord] = useState(false)
  const [phase, setPhase] = useState<Phase>('saisie')
  const [erreur, setErreur] = useState<string | null>(null)
  const [lus, setLus] = useState<DocumentN8n[]>([])
  const [cameraPour, setCameraPour] = useState<DocumentRequis | null>(null)
  const inputFichier = useRef<HTMLInputElement>(null)
  const inputPhoto = useRef<HTMLInputElement>(null)
  const cible = useRef<DocumentRequis | null>(null)
  const sondage = useRef<number | null>(null)
  // Documents gardés dans le compte depuis une visite précédente.
  const [enregistres, setEnregistres] = useState(false)
  const [chargementCompte, setChargementCompte] = useState(true)
  const identite = useRef<{ prenom: string; nom: string }>({ prenom: '', nom: '' })

  useEffect(() => () => {
    if (sondage.current) window.clearTimeout(sondage.current)
  }, [])

  // Les documents demandés dépendent de la situation : sans elle, on repasse par l'étape Situation.
  useEffect(() => {
    const s = lireSituation()
    if (s) setSituation(s)
    else router.replace('/situation')
  }, [router])

  const DOCUMENTS_REQUIS: DefinitionDocument[] = situation ? documentsPour(situation) : []

  // Connecté : on reprend les documents déjà vérifiés du compte, sans les redemander.
  useEffect(() => {
    let actif = true
    lireMonCompte()
      .then(async (compte) => {
        if (!actif) return
        identite.current = {
          prenom: compte.profil?.prenom || compte.prenom || '',
          nom: compte.profil?.nom || '',
        }
        if (!compte.etudiant_id || compte.documents.length === 0) return
        setEtudiantId(compte.etudiant_id)
        setLus(compte.documents)
        setEnregistres(true)
        setAccord(true)
        setPhase('resultat')
        // Les photos (gardées 30 jours) permettent de ne remplacer qu'un seul document.
        const photos = await lirePhotos().catch(() => [])
        if (!actif) return
        setFichiers((prev) => {
          const suite = { ...prev }
          for (const [ui, n8n] of Object.entries(TYPE_N8N) as [DocumentRequis, string][]) {
            const photo = photos.find((ph) => ph.type === n8n && ph.contenu_base64)
            if (photo && !suite[ui]) suite[ui] = photoVersFichier(photo)
          }
          return suite
        })
      })
      .catch(() => undefined)
      .finally(() => {
        if (actif) setChargementCompte(false)
      })
    return () => {
      actif = false
    }
  }, [])

  // Document lu par l'IA pour chaque type attendu.
  const parType = (type: DocumentRequis) => lus.find((d) => d.type === TYPE_N8N[type])
  const bloquantes = (d?: DocumentN8n) => (d?.anomalies ?? []).filter((a) => a.gravite === 'bloquante')

  const tousDeposes = DOCUMENTS_REQUIS.every((d) => fichiers[d.type])
  const peutEnvoyer = situation !== null && tousDeposes && accord && phase === 'saisie'

  const dossierComplet =
    phase === 'resultat' &&
    DOCUMENTS_REQUIS.length > 0 &&
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
    setEnregistres(false)
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
      // Prénom et nom du compte ; la pièce d'identité les corrige ensuite si besoin.
      donnees.append('prenom', identite.current.prenom || sessionCourante()?.prenom || '')
      donnees.append('nom', identite.current.nom || '')
      donnees.append('aides', 'apl')
      const session = sessionCourante()
      if (session?.email) donnees.append('email', session.email)
      donnees.append('ressources_12_mois', String(situation?.ressources ?? 0))
      if (situation?.bourse === 'oui' || situation?.bourse === 'non') {
        donnees.append('boursier', situation.bourse === 'oui' ? 'true' : 'false')
      }
      for (const d of DOCUMENTS_REQUIS) {
        let f = fichiers[d.type]
        if (!f) continue
        // L'IA lit des images : un PDF est transformé en image (ses premières pages) avant l'envoi.
        if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
          try {
            f = await pdfVersImage(f)
          } catch {
            throw new Error(`Le PDF « ${f.name} » n'a pas pu être lu. Envoie plutôt une photo ou une capture de ce document.`)
          }
        }
        donnees.append('photo', f, f.name)
      }
      const etudiantId = await deposerDocuments(donnees)
      // Le nouveau dossier devient celui du compte : il sera repris à la prochaine visite.
      void lierDossier(etudiantId).catch(() => undefined)
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
    const garde = enregistres && phase === 'resultat' && parType(type)
    if (!fichiers[type] && !garde) return { statut: 'manquant', extrait: '', probleme: null }
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

  if (chargementCompte && situation) {
    return (
      <p className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" />
        On regarde si tes documents sont déjà dans ton compte…
      </p>
    )
  }

  return (
    <>
      {enregistres && (
        <section
          aria-label="Documents gardés"
          className="mb-6 flex items-start gap-3 rounded-3xl border border-success/50 bg-success-soft p-5"
        >
          <ShieldCheck className="mt-0.5 size-6 shrink-0 text-success" aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">On a gardé tes documents de ta dernière visite</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Pas besoin de les redonner. Si l&apos;un d&apos;eux a changé (nouveau bail, nouvelle fiche de paie…),
              remplace-le avec le bouton de sa carte, puis renvoie ton dossier pour qu&apos;il soit revérifié.
            </p>
          </div>
        </section>
      )}
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
                    : `Envoie tes ${DOCUMENTS_REQUIS.length} documents pour continuer.`}
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
              nomFichier={
                fichiers[definition.type]?.name ?? (enregistres && parType(definition.type) ? 'Gardé dans ton compte' : null)
              }
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
          <h2 id="titre-envoi" className="text-xl font-bold text-foreground">
            Envoyer mes documents
          </h2>

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
                  ? `Ajoute tes ${DOCUMENTS_REQUIS.length} documents.`
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
          Tes {DOCUMENTS_REQUIS.length} documents sont vérifiés.
        </p>
      )}

      <nav aria-label="Navigation entre les étapes" className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <BoutonPrecedent href="/situation" label="Précédent : ta situation" />
        {dossierComplet ? (
          <Link
            href="/aides"
            className={cn(buttonVariants({ size: 'lg' }), 'h-12 gap-2 rounded-2xl px-6 text-base font-semibold')}
          >
            Voir mes aides
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        ) : (
          <div className="flex flex-col gap-1 sm:items-end">
            <button
              type="button"
              disabled
              className={cn(
                buttonVariants({ size: 'lg' }),
                'h-12 cursor-not-allowed gap-2 rounded-2xl bg-muted px-6 text-base font-semibold text-muted-foreground',
              )}
            >
              Voir mes aides
              <ArrowRight className="size-5" aria-hidden="true" />
            </button>
            <p className="text-sm text-muted-foreground">
              {phase === 'analyse' ? 'Vérification en cours…' : 'Envoie tes documents vérifiés pour continuer.'}
            </p>
          </div>
        )}
      </nav>

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
        accept="image/*,application/pdf,.pdf"
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
