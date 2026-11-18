'use client'

import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Loader2, Play, Send } from 'lucide-react'
import { lancerDemande, lireDemande, repondreDemande, type EtatDemande } from '@/lib/demandes'
import { getEtudiantId } from '@/lib/n8n'

const TERMINAUX = ['completed', 'failed', 'timed_out', 'interrupted']
const CLE = (aide: string) => `passerelle_demande_${aide}`

/** Pilotage d'un agent de demande (Visale, Mobili-Jeune) : l'étudiant le lance, se connecte lui-même, l'agent s'arrête avant l'envoi. */
export function DemandeAgent({ aide }: { aide: 'visale' | 'mobili_jeune' }) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [etat, setEtat] = useState<EtatDemande | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [reponse, setReponse] = useState('')
  const minuteur = useRef<number | null>(null)

  // Reprend une demande déjà lancée dans cette session de navigation.
  useEffect(() => {
    try {
      const id = window.sessionStorage.getItem(CLE(aide))
      if (id) {
        setSessionId(id)
        suivre(id)
      }
    } catch {
      // Stockage indisponible.
    }
    return () => {
      if (minuteur.current) window.clearTimeout(minuteur.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aide])

  function suivre(id: string) {
    minuteur.current = window.setTimeout(async () => {
      try {
        const e = await lireDemande(id)
        setEtat(e)
        if (TERMINAUX.includes(e.statut)) return
      } catch {
        // On réessaie au prochain passage.
      }
      suivre(id)
    }, 5000)
  }

  async function lancer() {
    setErreur(null)
    setEnvoi(true)
    try {
      const { session_id, lien } = await lancerDemande(aide, getEtudiantId())
      try {
        window.sessionStorage.setItem(CLE(aide), session_id)
      } catch {
        // Stockage indisponible.
      }
      setSessionId(session_id)
      setEtat({ statut: 'pending', message: null, lien, etapes: 0 })
      suivre(session_id)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'agent n'a pas pu démarrer.")
    } finally {
      setEnvoi(false)
    }
  }

  async function repondre(texte: string) {
    if (!sessionId || !texte.trim()) return
    try {
      await repondreDemande(sessionId, texte.trim())
      setReponse('')
      setEtat((e) => (e ? { ...e, statut: 'running' } : e))
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Ta réponse n'a pas pu être envoyée.")
    }
  }

  const attendToi = etat?.statut === 'idle'
  const fini = etat ? TERMINAUX.includes(etat.statut) : false

  return (
    <div className="flex flex-col gap-3">
      {!sessionId && (
        <>
          <p className="text-base text-foreground">
            L&apos;agent prépare ta demande sur ton compte Action Logement. Tu te connectes toi-même, et il
            s&apos;arrête avant l&apos;envoi.
          </p>
          <button
            type="button"
            onClick={lancer}
            disabled={envoi}
            className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/30 disabled:opacity-60"
          >
            {envoi ? <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
            Préparer ma demande
          </button>
        </>
      )}

      {sessionId && !attendToi && !fini && (
        <p className="flex items-center gap-2 text-base text-foreground">
          <Loader2 className="size-4 shrink-0 text-step-blue motion-safe:animate-spin" aria-hidden="true" />
          L&apos;agent remplit ta demande…
        </p>
      )}

      {attendToi && (
        <div className="flex flex-col gap-2 rounded-2xl border-2 border-step-orange bg-step-orange-soft p-4">
          <p className="font-semibold text-foreground">L&apos;agent a besoin de toi</p>
          {etat?.message && <p className="whitespace-pre-line text-sm text-foreground">{etat.message}</p>}
          {etat?.lien && (
            <a
              href={etat.lien}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-primary hover:underline"
            >
              Ouvrir la fenêtre de l&apos;agent pour te connecter
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => repondre("C'est fait, je suis connecté.")}
              className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              C&apos;est fait, je suis connecté
            </button>
            <input
              value={reponse}
              onChange={(e) => setReponse(e.target.value)}
              placeholder="Ou réponds à l'agent"
              className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
            />
            <button
              type="button"
              onClick={() => repondre(reponse)}
              aria-label="Envoyer la réponse"
              className="inline-flex size-10 items-center justify-center rounded-full border border-border hover:bg-muted"
            >
              <Send className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {fini && (
        <p className="text-base font-semibold text-step-green">
          {etat?.statut === 'completed'
            ? "Ta demande est prête : relis-la et envoie-la toi-même sur le site."
            : "L'agent s'est arrêté avant la fin. On te guide pour terminer."}
        </p>
      )}

      {erreur && (
        <p role="alert" className="text-sm font-medium text-danger">
          {erreur}
        </p>
      )}
    </div>
  )
}
