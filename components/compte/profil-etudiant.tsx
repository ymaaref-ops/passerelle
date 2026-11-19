'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, FileText, Loader2, LogOut, RefreshCw, UserRound } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { lireMonCompte, seDeconnecter, type DocumentEnregistre, type MonCompte } from '@/lib/compte'
import { cn } from '@/lib/utils'

const NOMS_DOCUMENTS: Record<string, string> = {
  piece_identite: "Pièce d'identité",
  bail: 'Bail',
  certificat_scolarite: 'Certificat de scolarité',
  avis_imposition: "Avis d'imposition",
  fiche_paie: 'Fiche de paie',
  quittance_loyer: 'Quittance de loyer',
  autre: 'Autre document',
}

function dateFr(v: string | null | undefined): string | null {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function euros(v: number | null | undefined): string | null {
  return v === null || v === undefined ? null : `${Number(v).toLocaleString('fr-FR')} €`
}

function Ligne({ libelle, valeur }: { libelle: string; valeur: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-3 last:border-b-0 sm:flex-row sm:gap-4">
      <dt className="text-sm text-muted-foreground sm:w-48 sm:shrink-0">{libelle}</dt>
      <dd className="text-foreground">{valeur || <span className="text-muted-foreground">Pas encore renseigné</span>}</dd>
    </div>
  )
}

function etatDocument(d: DocumentEnregistre): { ok: boolean; texte: string } {
  const bloquante = (d.anomalies ?? []).find((a) => a.gravite === 'bloquante')
  if (d.statut === 'rejete' || bloquante) return { ok: false, texte: bloquante?.message ?? 'À remplacer' }
  if (d.statut === 'verifie') return { ok: true, texte: 'Vérifié' }
  return { ok: false, texte: 'En cours de vérification' }
}

export function ProfilEtudiant() {
  const router = useRouter()
  const [compte, setCompte] = useState<MonCompte | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    lireMonCompte()
      .then(setCompte)
      .catch((e) => setErreur(e instanceof Error ? e.message : 'Ton profil ne peut pas être chargé.'))
  }, [])

  function deconnexion() {
    seDeconnecter()
    router.push('/')
  }

  if (erreur) {
    return (
      <p role="alert" className="font-medium text-danger">
        {erreur}
      </p>
    )
  }
  if (!compte) {
    return (
      <p className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" />
        Chargement de ton profil…
      </p>
    )
  }

  const p = compte.profil
  const loyer = p?.loyer_hors_charges != null ? `${euros(p.loyer_hors_charges)} + ${euros(p.charges ?? 0)} de charges` : null
  // Un seul document par type : le plus récent.
  const documents = compte.documents.filter((d, i, tous) => tous.findIndex((x) => x.type === d.type) === i)
  const photosSupprimees = documents.some((d) => d.photo_supprimee_le)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <UserRound className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {compte.prenom ?? p?.prenom ?? 'Mon profil'}
            </h1>
            <p className="text-sm text-muted-foreground">{compte.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={deconnexion}
          className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 gap-2 rounded-2xl font-semibold')}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Se déconnecter
        </button>
      </header>

      <section aria-labelledby="titre-infos" className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <h2 id="titre-infos" className="text-xl font-bold text-foreground">
          Mes informations
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Lues sur tes documents par Passerelle. Pour les corriger, remplace le document concerné.
        </p>
        <dl className="mt-3">
          <Ligne libelle="Nom" valeur={p ? [p.prenom, p.nom].filter(Boolean).join(' ') : null} />
          <Ligne libelle="Date de naissance" valeur={dateFr(p?.date_naissance)} />
          <Ligne libelle="Nationalité" valeur={p?.nationalite} />
          <Ligne libelle="Établissement" valeur={p?.etablissement} />
          <Ligne libelle="Formation" valeur={p?.formation} />
          <Ligne libelle="Logement" valeur={p?.adresse_logement} />
          <Ligne libelle="Loyer" valeur={loyer} />
          <Ligne libelle="Activité" valeur={p?.situation_pro} />
          <Ligne libelle="Revenus sur 12 mois" valeur={euros(p?.ressources_12_mois)} />
          <Ligne
            libelle="Boursier"
            valeur={p?.boursier === true ? 'Oui' : p?.boursier === false ? 'Non' : null}
          />
          <Ligne libelle="Compte créé le" valeur={dateFr(compte.inscrit_le)} />
        </dl>
      </section>

      <section aria-labelledby="titre-docs" className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="titre-docs" className="text-xl font-bold text-foreground">
              Mes documents
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Gardés dans ton compte : tu n&apos;as pas à les redonner à chaque démarche.
            </p>
          </div>
          <Link
            href="/documents"
            className={cn(buttonVariants({ variant: 'outline' }), 'h-10 shrink-0 gap-2 rounded-2xl font-semibold')}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            {documents.length ? 'Changer mes documents' : 'Ajouter mes documents'}
          </Link>
        </div>

        {documents.length === 0 ? (
          <p className="mt-4 text-muted-foreground">Tu n&apos;as pas encore déposé de documents.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {documents.map((d) => {
              const etat = etatDocument(d)
              return (
                <li key={d.id} className="flex items-start gap-3 rounded-2xl bg-muted/60 px-4 py-3">
                  <FileText className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{NOMS_DOCUMENTS[d.type] ?? d.type}</p>
                    {d.created_at && <p className="text-sm text-muted-foreground">Déposé le {dateFr(d.created_at)}</p>}
                  </div>
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1 text-sm font-medium',
                      etat.ok ? 'text-success' : 'text-step-orange',
                    )}
                  >
                    {etat.ok ? (
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="size-4" aria-hidden="true" />
                    )}
                    {etat.texte}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        {photosSupprimees && (
          <p className="mt-3 text-sm text-muted-foreground">
            Les photos sont supprimées après 30 jours : les informations lues restent, mais pour changer un document il
            faudra redonner les autres.
          </p>
        )}
      </section>

      <Link href="/demarrer" className={cn(buttonVariants({ size: 'lg' }), 'h-12 self-start rounded-2xl px-6 font-semibold')}>
        Continuer mes démarches
      </Link>
    </div>
  )
}
