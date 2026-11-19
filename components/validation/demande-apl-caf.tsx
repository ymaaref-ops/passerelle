'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, ExternalLink, FileSignature, Loader2, TriangleAlert } from 'lucide-react'
import { getEtudiantId, lireEtat, type DemandeCaf } from '@/lib/n8n'
import { COMPTE_DEMANDE_CAF, lancerDemandeCaf } from '@/lib/demande-caf'
import { adresseFenetre, ouvrirFenetre } from '@/lib/fenetre'

const INTERVALLE_MS = 15_000

/**
 * Après la simulation : l'agent H prépare la vraie demande d'APL sur caf.fr et s'arrête au récapitulatif.
 * L'étudiante vérifie, puis valide elle-même l'envoi sur son espace caf.fr.
 */
export function DemandeAplCaf({ email, simulationFaite }: { email: string | null; simulationFaite: boolean }) {
  const [demande, setDemande] = useState<DemandeCaf | null | undefined>(undefined)
  const [accord, setAccord] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const relie = (email ?? '').toLowerCase() === COMPTE_DEMANDE_CAF

  const lire = useCallback(async () => {
    try {
      const etat = await lireEtat()
      const apl = etat.demarches?.find((d) => d.aide_code === 'apl')
      setDemande(apl?.resultat_agent?.demande ?? null)
    } catch {
      setDemande(null)
    }
  }, [])

  useEffect(() => {
    if (relie) void lire()
  }, [relie, lire])

  // Pendant que l'agent travaille, on relit l'état (lecture Supabase, ne consomme rien sur n8n).
  useEffect(() => {
    if (demande?.statut !== 'en_cours') return
    const t = window.setInterval(() => void lire(), INTERVALLE_MS)
    return () => window.clearInterval(t)
  }, [demande?.statut, lire])

  if (!relie || !simulationFaite) return null

  async function lancer() {
    setEnvoi(true)
    setErreur(null)
    try {
      const r = await lancerDemandeCaf(getEtudiantId())
      setDemande({ session_id: r.session_id, lien_public: r.lien, statut: 'en_cours' })
      if (r.lien) ouvrirFenetre(adresseFenetre(r.session_id, r.lien, 'caf'))
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'agent n'a pas pu démarrer.")
    } finally {
      setEnvoi(false)
    }
  }

  const fenetre =
    demande?.session_id && demande.lien_public ? adresseFenetre(demande.session_id, demande.lien_public, 'caf') : null
  const statut = demande?.statut

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-primary/30 bg-primary-soft p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <FileSignature className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h3 className="text-base font-bold text-foreground">Faire ma vraie demande d&apos;APL</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Un agent se connecte à ton compte caf.fr, remplit la demande avec ces informations et s&apos;arrête sur
            l&apos;écran récapitulatif. Il n&apos;envoie rien : c&apos;est toi qui valides à la fin.
          </p>
        </div>
      </div>

      {demande === undefined && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {demande !== undefined && (!statut || statut === 'bloque') && (
        <div className="flex flex-col gap-3">
          {statut === 'bloque' && (
            <p className="flex items-start gap-2 rounded-2xl border border-step-orange-border bg-step-orange-soft p-3 text-sm text-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-step-orange" aria-hidden="true" />
              L&apos;agent s&apos;est arrêté{demande?.etape_atteinte ? ` à l'étape « ${demande.etape_atteinte} »` : ''}.{' '}
              {demande?.remarques ?? ''}
            </p>
          )}
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={accord}
              onChange={(e) => setAccord(e.target.checked)}
              className="mt-0.5 size-4 accent-primary"
            />
            J&apos;accepte que l&apos;agent prépare ma demande sur mon compte caf.fr. Je la vérifierai et la validerai
            moi-même.
          </label>
          <button
            type="button"
            disabled={!accord || envoi}
            onClick={lancer}
            className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/30 disabled:opacity-50"
          >
            {envoi && <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />}
            {statut === 'bloque' ? 'Relancer la préparation' : 'Préparer ma demande'}
          </button>
        </div>
      )}

      {(statut === 'en_cours' || statut === 'en_attente_utilisateur') && (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Loader2 className="size-4 text-primary motion-safe:animate-spin" aria-hidden="true" />
            L&apos;agent prépare ta demande sur caf.fr…
          </p>
          <p className="text-sm text-muted-foreground">
            Si la CAF t&apos;envoie un code par e-mail, ou si l&apos;agent te pose une question, réponds-lui dans sa
            fenêtre.
          </p>
          {fenetre && (
            <button
              type="button"
              onClick={() => ouvrirFenetre(fenetre)}
              className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Ouvrir la fenêtre de l&apos;agent
            </button>
          )}
        </div>
      )}

      {statut === 'pret_a_valider' && (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-step-green">
            <CheckCircle2 className="size-5" aria-hidden="true" />
            Ta demande est prête : il ne reste qu&apos;à la valider.
          </p>
          {demande?.recapitulatif && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">Récapitulatif affiché par la CAF</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {demande.recapitulatif}
              </p>
            </div>
          )}
          {!!demande?.questions_sans_reponse?.length && (
            <div className="rounded-2xl border border-step-orange-border bg-step-orange-soft p-4 text-sm text-foreground">
              <p className="font-semibold">À compléter toi-même</p>
              <ul className="mt-1 list-disc pl-5">
                {demande.questions_sans_reponse.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Vérifie chaque ligne, puis connecte-toi sur caf.fr pour relire ta demande et cliquer toi-même sur
            « Valider ».
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href="https://www.caf.fr/allocataires/mon-compte"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              Valider sur caf.fr
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
            {fenetre && (
              <button
                type="button"
                onClick={() => ouvrirFenetre(fenetre)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground outline-none hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/30"
              >
                Revoir ce qu&apos;a fait l&apos;agent
              </button>
            )}
          </div>
        </div>
      )}

      {erreur && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erreur}
        </p>
      )}
    </div>
  )
}
