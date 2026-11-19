'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Briefcase, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { useProfilCourant } from '@/lib/profil-courant'
import { lancerDemarches, lireEtat, type DemarcheN8n } from '@/lib/n8n'

const NOMS: Record<string, string> = {
  apl: 'Simulation APL',
  prime_activite: "Simulation de prime d'activité",
  bourse_crous: 'Simulation de bourse Crous',
  pret_garanti: 'Comparaison de prêts',
}

/** Aide de l'interface à relancer pour chaque démarche n8n. */
const AIDES_UI: Record<string, string[]> = {
  apl: ['apl'],
  prime_activite: ['prime-activite'],
  bourse_crous: ['bourse-crous'],
  pret_garanti: ['pret-etat', 'pret-lbp', 'pret-sg', 'pret-cic'],
}

/** Ce que l'étudiant peut faire, selon ce qui a bloqué l'agent. */
function conseil(raison: string): { texte: string; lien?: { href: string; label: string } } | null {
  const r = raison.toLowerCase()
  if (/code postal|adresse|lieu de r[ée]sidence/.test(r))
    return { texte: 'Ajoute ton code postal dans ton profil, puis relance.', lien: { href: '/profil', label: 'Ouvrir mon profil' } }
  if (/avis d.imposition/.test(r))
    return { texte: "Ajoute l'avis d'imposition de tes parents dans tes documents, puis relance.", lien: { href: '/documents', label: 'Mes documents' } }
  if (/salaire|revenu|ressource/.test(r))
    return { texte: 'Vérifie ton salaire dans ta situation ou ton profil, puis relance.', lien: { href: '/profil', label: 'Ouvrir mon profil' } }
  return null
}

function useDemarches() {
  const [demarches, setDemarches] = useState<DemarcheN8n[] | null>(null)
  const [tour, setTour] = useState(0)
  useEffect(() => {
    let actif = true
    let minuteur: number | null = null
    async function lire() {
      try {
        const etat = await lireEtat()
        if (!actif) return
        const liste = etat.demarches ?? []
        setDemarches(liste)
        if (liste.some((d) => d.cochee && d.statut === 'en_cours')) minuteur = window.setTimeout(lire, 15000)
      } catch {
        if (actif) minuteur = window.setTimeout(lire, 15000)
      }
    }
    void lire()
    return () => {
      actif = false
      if (minuteur) window.clearTimeout(minuteur)
    }
  }, [tour])
  return { demarches, relire: () => setTour((t) => t + 1) }
}

/** Démarches dont l'agent s'est arrêté : la raison en clair, quoi faire, et un bouton pour relancer. */
export function SectionBloquees() {
  const { demarches, relire } = useDemarches()
  const [relance, setRelance] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const bloquees = (demarches ?? []).filter((d) => d.cochee && d.statut === 'bloquee' && AIDES_UI[d.aide_code])
  if (bloquees.length === 0) return null

  async function relancer(code: string) {
    setErreur(null)
    setRelance(code)
    try {
      await lancerDemarches(AIDES_UI[code])
      relire()
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La démarche n'a pas pu être relancée.")
    } finally {
      setRelance(null)
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-3xl border-2 border-step-orange bg-step-orange-soft p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
        <AlertTriangle className="size-6 text-step-orange" aria-hidden="true" />
        {bloquees.length > 1 ? 'Des démarches se sont arrêtées' : 'Une démarche s’est arrêtée'}
      </h2>
      <ul className="flex flex-col gap-3">
        {bloquees.map((d) => {
          const raison = d.resultat_agent?.etape_bloquante || "L'agent n'a pas pu terminer."
          const c = conseil(raison)
          return (
            <li key={d.aide_code} className="flex flex-col gap-2 rounded-2xl bg-card p-4">
              <p className="font-semibold text-foreground">{NOMS[d.aide_code] ?? d.aide_code}</p>
              <p className="text-sm text-foreground">
                Il manquait : <strong>{raison}</strong>
              </p>
              {c && <p className="text-sm text-muted-foreground">{c.texte}</p>}
              <div className="flex flex-wrap gap-2">
                {c?.lien && (
                  <Link
                    href={c.lien.href}
                    className="inline-flex h-10 items-center rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground hover:bg-muted"
                  >
                    {c.lien.label}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => relancer(d.aide_code)}
                  disabled={relance !== null}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {relance === d.aide_code ? (
                    <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="size-4" aria-hidden="true" />
                  )}
                  Relancer
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {erreur && (
        <p role="alert" className="text-sm font-medium text-danger">
          {erreur}
        </p>
      )}
    </section>
  )
}

/** Résultat de la simulation de prime d'activité. */
export function SectionPrime() {
  const { demarches } = useDemarches()
  const profil = useProfilCourant()
  const d = (demarches ?? []).find((x) => x.aide_code === 'prime_activite' && x.cochee)
  if (!demarches || !d || d.statut === 'bloquee') return null
  const enCours = d.statut === 'en_cours'
  const montant = d.montant_estime == null || d.montant_estime === '' ? null : Math.round(Number(d.montant_estime))
  return (
    <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Briefcase className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold leading-snug text-foreground">Prime d&apos;activité</h2>
          <p className="text-sm text-muted-foreground">Simulation sur caf.fr</p>
        </div>
        {!enCours && montant !== null && montant > 0 && (
          <p className="text-xl font-bold text-step-green sm:text-2xl">{montant} €/mois</p>
        )}
      </div>
      <p className="mt-4 text-foreground">
        {enCours ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-5 text-primary motion-safe:animate-spin" aria-hidden="true" />
            L&apos;agent fait la simulation…
          </span>
        ) : montant === 0 ? (
          "D'après le simulateur de la CAF, tu n'as pas droit à la prime d'activité pour l'instant."
        ) : montant !== null ? (
          'Estimation du simulateur officiel. La demande se fait sur ton espace caf.fr.'
        ) : (
          d.resultat_agent?.etape_bloquante || 'Simulation terminée.'
        )}
      </p>

      {!enCours && montant !== null && montant > 0 && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-muted/60 p-4">
          <p className="text-sm font-semibold text-foreground">Pour faire ta demande sur caf.fr, garde ces informations sous la main :</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
            <li>Ton salaire net par mois : {profil?.salaire != null ? `${profil.salaire.toLocaleString('fr-FR')} €` : 'tes 3 dernières fiches de paie'}</li>
            <li>Tes salaires des 3 derniers mois, mois par mois (sur tes fiches de paie)</li>
            <li>Ton adresse et ton loyer{profil?.loyer != null ? ` (${profil.loyer.toLocaleString('fr-FR')} € charges comprises)` : ''}</li>
            <li>Tes autres aides éventuelles (APL, bourse)</li>
            <li>Ton numéro allocataire, si tu en as déjà un</li>
          </ul>
          <a
            href="https://www.caf.fr/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 self-start rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Faire ma demande sur caf.fr
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
          <p className="text-xs text-muted-foreground">
            Tu te connectes à ton espace Caf avec tes propres identifiants : Passerelle n&apos;envoie rien à ta place.
          </p>
        </div>
      )}
    </section>
  )
}
