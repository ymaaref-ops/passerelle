'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, FileText, Loader2, LogOut, Pencil, RefreshCw, Save, UserRound } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  enregistrerProfil,
  enregistrerQuestionnaireCompte,
  enregistrerSituationCompte,
  lireMonCompte,
  seDeconnecter,
  type DocumentEnregistre,
  type MonCompte,
  type ProfilEtudiant as Profil,
} from '@/lib/compte'
import { setEtudiantId } from '@/lib/n8n'
import { enregistrerSituation, lireSituation, type Activite, type Situation } from '@/lib/session'
import { enregistrerQuestionnaireLocal, lireQuestionnaire } from '@/lib/questionnaire'

/** L'activité du profil est la même que celle de l'étape Situation : elle décide des documents demandés. */
const ACTIVITES: { valeur: Activite; label: string; statut: string }[] = [
  { valeur: 'alternance', label: 'Alternance', statut: 'alternant' },
  { valeur: 'job', label: 'Job étudiant', statut: 'salarie' },
  { valeur: 'aucune', label: "Pas d'activité", statut: 'etudiant' },
]
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

type Champ = {
  cle: keyof Profil
  libelle: string
  type?: 'text' | 'date' | 'number' | 'tel' | 'oui-non'
  aide?: string
}

const CHAMPS: Champ[] = [
  { cle: 'prenom', libelle: 'Prénom' },
  { cle: 'nom', libelle: 'Nom' },
  { cle: 'date_naissance', libelle: 'Date de naissance', type: 'date' },
  { cle: 'lieu_naissance', libelle: 'Lieu de naissance', aide: 'Ville et pays' },
  { cle: 'nationalite', libelle: 'Nationalité' },
  { cle: 'telephone', libelle: 'Téléphone', type: 'tel', aide: 'Demandé par Visale et Action Logement' },
  { cle: 'etablissement', libelle: 'Établissement' },
  { cle: 'formation', libelle: 'Formation', aide: 'Précise « en alternance » si c’est le cas' },
  { cle: 'adresse_logement', libelle: 'Adresse du logement' },
  { cle: 'code_postal', libelle: 'Code postal (où tu habites)', aide: '5 chiffres. La CAF le demande dans ses simulateurs.' },
  { cle: 'type_logement', libelle: 'Type de logement', aide: 'Par exemple : studio meublé, colocation…' },
  { cle: 'loyer_hors_charges', libelle: 'Loyer hors charges (€)', type: 'number' },
  { cle: 'charges', libelle: 'Charges (€)', type: 'number' },
  { cle: 'ressources_12_mois', libelle: 'Revenus des 12 derniers mois (€)', type: 'number' },
  { cle: 'boursier', libelle: 'Boursier', type: 'oui-non' },
]

type Brouillon = Record<keyof Profil, string>

function versBrouillon(p: Profil | null): Brouillon {
  const b = {} as Brouillon
  for (const c of CHAMPS) {
    const v = p?.[c.cle]
    b[c.cle] = c.type === 'oui-non' ? (v === true ? 'oui' : v === false ? 'non' : '') : v == null ? '' : String(v)
  }
  return b
}

function afficher(c: Champ, p: Profil | null): string | null {
  const v = p?.[c.cle]
  if (v === null || v === undefined || v === '') return null
  if (c.type === 'oui-non') return v ? 'Oui' : 'Non'
  if (c.type === 'date') return dateFr(String(v))
  if (c.type === 'number') return euros(Number(v))
  return String(v)
}

const CHAMP_SAISIE =
  'h-11 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus-visible:ring-4 focus-visible:ring-ring/30'

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
  const [edition, setEdition] = useState(false)
  const [brouillon, setBrouillon] = useState<Brouillon>(versBrouillon(null))
  const [enregistrement, setEnregistrement] = useState(false)
  const [erreurProfil, setErreurProfil] = useState<string | null>(null)
  const [enregistre, setEnregistre] = useState(false)
  const [situation, setSituation] = useState<Situation | null>(null)
  const [activite, setActivite] = useState<Activite | ''>('')

  useEffect(() => {
    lireMonCompte()
      .then((c) => {
        setCompte(c)
        if (c.etudiant_id) setEtudiantId(c.etudiant_id)
        const s = lireSituation() ?? (c.situation as Situation | null) ?? null
        setSituation(s)
        setActivite(s?.activite ?? '')
      })
      .catch((e) => setErreur(e instanceof Error ? e.message : 'Ton profil ne peut pas être chargé.'))
  }, [])

  function modifier() {
    setBrouillon(versBrouillon(compte?.profil ?? null))
    setActivite(situation?.activite ?? '')
    setErreurProfil(null)
    setEnregistre(false)
    setEdition(true)
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault()
    setEnregistrement(true)
    setErreurProfil(null)
    try {
      const valeurs: Record<string, string | boolean | null> = {}
      for (const c of CHAMPS) {
        const v = brouillon[c.cle].trim()
        valeurs[c.cle] = c.type === 'oui-non' ? (v === 'oui' ? true : v === 'non' ? false : null) : v || null
      }
      const choix = ACTIVITES.find((a) => a.valeur === activite)
      if (choix) valeurs.situation_pro = choix.label
      const r = await enregistrerProfil(valeurs)
      // Activité changée : la situation (documents demandés, aides) et le questionnaire suivent.
      if (choix && situation && situation.activite !== choix.valeur) {
        const nouvelle: Situation = { ...situation, activite: choix.valeur }
        enregistrerSituation(nouvelle)
        setSituation(nouvelle)
        await enregistrerSituationCompte(nouvelle).catch(() => undefined)
        const q = lireQuestionnaire()
        const questionnaire = {
          email_demarches: q?.email_demarches ?? compte?.email ?? '',
          reponses: { ...(q?.reponses ?? {}), statut: choix.statut },
        }
        enregistrerQuestionnaireLocal(questionnaire)
        await enregistrerQuestionnaireCompte(questionnaire).catch(() => undefined)
      }
      setEtudiantId(r.etudiant_id)
      setCompte((ancien) =>
        ancien
          ? { ...ancien, etudiant_id: r.etudiant_id, profil: r.profil, prenom: r.profil?.prenom || ancien.prenom }
          : ancien,
      )
      setEdition(false)
      setEnregistre(true)
    } catch (err) {
      setErreurProfil(err instanceof Error ? err.message : "Tes informations n'ont pas pu être enregistrées.")
    } finally {
      setEnregistrement(false)
    }
  }

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

      <section aria-labelledby="titre-infos" className="rounded-3xl bg-card shadow-carte p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="titre-infos" className="text-xl font-bold text-foreground">
              Mes informations
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Remplies à partir de tes documents. Complète ou corrige-les : les agents s&apos;en servent pour tes
              démarches.
            </p>
          </div>
          {!edition && (
            <button
              type="button"
              onClick={modifier}
              className={cn(buttonVariants({ variant: 'outline' }), 'h-10 shrink-0 gap-2 rounded-2xl font-semibold')}
            >
              <Pencil className="size-4" aria-hidden="true" />
              Modifier
            </button>
          )}
        </div>

        {enregistre && !edition && (
          <p role="status" className="mt-3 flex items-center gap-2 text-sm font-medium text-success">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Tes informations sont enregistrées.
          </p>
        )}

        {edition ? (
          <form onSubmit={enregistrer} className="mt-4 flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Activité</span>
                <select value={activite} onChange={(e) => setActivite(e.target.value as Activite)} className={CHAMP_SAISIE}>
                  <option value="" disabled>
                    Choisis…
                  </option>
                  {ACTIVITES.map((a) => (
                    <option key={a.valeur} value={a.valeur}>
                      {a.label}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">
                  Décide des documents demandés : la fiche de paie n&apos;est obligatoire qu&apos;en alternance.
                </span>
              </label>
              {CHAMPS.map((c) => (
                <label key={c.cle} className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">{c.libelle}</span>
                  {c.type === 'oui-non' ? (
                    <select
                      value={brouillon[c.cle]}
                      onChange={(e) => setBrouillon((b) => ({ ...b, [c.cle]: e.target.value }))}
                      className={CHAMP_SAISIE}
                    >
                      <option value="">Je ne sais pas</option>
                      <option value="oui">Oui</option>
                      <option value="non">Non</option>
                    </select>
                  ) : (
                    <input
                      type={c.type ?? 'text'}
                      inputMode={c.type === 'number' ? 'decimal' : undefined}
                      min={c.type === 'number' ? 0 : undefined}
                      value={brouillon[c.cle]}
                      onChange={(e) => setBrouillon((b) => ({ ...b, [c.cle]: e.target.value }))}
                      autoComplete={c.cle === 'telephone' ? 'tel' : c.cle === 'prenom' ? 'given-name' : c.cle === 'nom' ? 'family-name' : undefined}
                      required={c.cle === 'prenom' || c.cle === 'nom'}
                      className={CHAMP_SAISIE}
                    />
                  )}
                  {c.aide && <span className="text-xs text-muted-foreground">{c.aide}</span>}
                </label>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              E-mail : <strong className="text-foreground">{compte.email}</strong> (celui de ton compte). Si tu
              redéposes un document, les informations qu&apos;il contient seront relues.
            </p>
            {erreurProfil && (
              <p role="alert" className="text-sm font-medium text-danger">
                {erreurProfil}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={enregistrement}
                className={cn(buttonVariants({ size: 'lg' }), 'h-11 gap-2 rounded-2xl px-5 font-semibold')}
              >
                {enregistrement ? (
                  <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="size-4" aria-hidden="true" />
                )}
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => setEdition(false)}
                className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 rounded-2xl px-5 font-semibold')}
              >
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <dl className="mt-3">
            <Ligne libelle="Activité" valeur={ACTIVITES.find((a) => a.valeur === situation?.activite)?.label ?? p?.situation_pro} />
            {CHAMPS.map((c) => (
              <Ligne key={c.cle} libelle={c.libelle} valeur={afficher(c, p)} />
            ))}
            <Ligne libelle="E-mail" valeur={compte.email} />
            <Ligne libelle="Compte créé le" valeur={dateFr(compte.inscrit_le)} />
          </dl>
        )}
      </section>

      <section aria-labelledby="titre-docs" className="rounded-3xl bg-card shadow-carte p-5 sm:p-6">
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
