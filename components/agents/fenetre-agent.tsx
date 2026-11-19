'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ExternalLink, Loader2, Send } from 'lucide-react'
import { repondreDemande } from '@/lib/demandes'
import { repondreAgent } from '@/lib/logement'
import { repondreDemandeCaf } from '@/lib/demande-caf'
import { getEtudiantId } from '@/lib/n8n'

/** Seuls les liens de partage H sont lus (page publique en lecture seule). */
const PREFIXE_PARTAGE = 'https://agp.eu.hcompany.ai/share/'
const INTERVALLE_MS = 4000
/** Une vérification anti-robot se passe dans le navigateur de l'agent : l'étudiant la voit mais ne peut pas la cocher d'ici. */
const MOTS_CAPTCHA = /captcha|robot|cloudflare|v[ée]rification|humain/i
const MESSAGE_PASSER =
  'Un CAPTCHA bloque cette annonce : passe-la, marque-la « non lue (CAPTCHA) » et continue avec les autres annonces.'

interface Observation {
  url: string | null
  titre: string | null
  image: string | null
}

interface Vue {
  statut: string
  observation: Observation | null
  messages: string[]
  demande: string | null
}

type Evenement = { type: string; data?: { event?: Record<string, unknown>; state?: string } }

function lireTrajectoire(t: { status?: string; events?: Evenement[]; answer?: unknown }): Vue {
  let observation: Observation | null = null
  const messages: string[] = []
  for (const e of t.events ?? []) {
    const ev = e.data?.event as Record<string, any> | undefined
    if (!ev) continue
    if (ev.kind === 'observation_event' && ev.observation) {
      observation = {
        url: ev.observation.url ?? null,
        titre: ev.observation.title ?? null,
        image: ev.observation.image?.source ?? null,
      }
    }
    if (ev.kind === 'policy_event') {
      const texte = String(ev.message?.content ?? '').trim()
      if (texte) messages.push(texte)
    }
  }
  let demande: string | null = null
  const r = t.answer as Record<string, unknown> | string | null | undefined
  const objet = typeof r === 'string' ? (() => { try { return JSON.parse(r) } catch { return null } })() : r
  if (objet && typeof objet === 'object') {
    const o = objet as Record<string, unknown>
    demande = (o.action_requise_etudiant ?? o.action_requise ?? o.question ?? null) as string | null
  }
  return { statut: t.status ?? 'pending', observation, messages: messages.slice(-4), demande }
}

const LIBELLES: Record<string, string> = {
  pending: "L'agent démarre…",
  running: "L'agent travaille",
  idle: "L'agent attend ta réponse",
  completed: "L'agent a terminé",
  failed: "L'agent s'est arrêté",
  timed_out: "L'agent a dépassé le temps prévu",
  interrupted: "L'agent a été interrompu",
}

export function FenetreAgent() {
  const params = useSearchParams()
  const session = params.get('session') ?? ''
  const lienBrut = params.get('lien') ?? ''
  const lien = lienBrut.startsWith(PREFIXE_PARTAGE) ? lienBrut : null
  // Quel agent répond : logement (passerelle-logement) ou demande (Visale, Mobili-Jeune).
  const brut = params.get('source')
  const source = brut === 'logement' ? 'logement' : brut === 'caf' ? 'caf' : 'demande'

  const [vue, setVue] = useState<Vue | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [reponse, setReponse] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [envoye, setEnvoye] = useState(false)
  const minuteur = useRef<number | null>(null)

  useEffect(() => {
    if (!lien) return
    let actif = true
    async function lire() {
      try {
        const t = await fetch(lien as string, { cache: 'no-store' }).then((r) => r.json())
        if (actif) {
          setVue(lireTrajectoire(t))
          setErreur(null)
        }
      } catch {
        if (actif) setErreur("Impossible de lire la fenêtre de l'agent pour le moment.")
      }
      if (actif) minuteur.current = window.setTimeout(lire, INTERVALLE_MS)
    }
    void lire()
    return () => {
      actif = false
      if (minuteur.current) window.clearTimeout(minuteur.current)
    }
  }, [lien])

  async function envoyer(texte: string) {
    if (!session || !texte.trim()) return
    setEnvoi(true)
    setErreur(null)
    try {
      if (source === 'caf') await repondreDemandeCaf(getEtudiantId(), session, texte.trim())
      else await (source === 'logement' ? repondreAgent : repondreDemande)(session, texte.trim())
      setReponse('')
      setEnvoye(true)
      setVue((v) => (v ? { ...v, statut: 'running' } : v))
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Ta réponse n'a pas pu être envoyée.")
    } finally {
      setEnvoi(false)
    }
  }

  if (!lien) {
    return <p className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Lien de l&apos;agent manquant.</p>
  }

  const attend = vue?.statut === 'idle'
  // L'agent logement répond en texte : sa demande est son dernier message.
  const demandeTexte =
    vue?.demande ?? (source === 'logement' && vue?.messages.length ? vue.messages[vue.messages.length - 1] : null)
  const captcha = attend && source === 'logement' && MOTS_CAPTCHA.test(`${demandeTexte ?? ''} ${vue?.observation?.titre ?? ''}`)
  let site: string | null = null
  try {
    site = vue?.observation?.url ? new URL(vue.observation.url).host : null
  } catch {
    site = null
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-lg font-bold text-foreground">
          {!vue || vue.statut === 'running' || vue.statut === 'pending' ? (
            <Loader2 className="size-5 text-primary motion-safe:animate-spin" aria-hidden="true" />
          ) : null}
          {vue ? (LIBELLES[vue.statut] ?? vue.statut) : 'Ouverture de la fenêtre…'}
        </p>
        {site && <p className="text-sm text-muted-foreground">Sur {site}</p>}
      </div>

      {attend && (
        <section className="flex flex-col gap-3 rounded-2xl border-2 border-step-orange bg-step-orange-soft p-4">
          <p className="font-semibold text-foreground">
            {captcha ? "Une vérification anti-robot bloque l'agent" : "L'agent a besoin de toi"}
          </p>
          {demandeTexte && <p className="leading-relaxed text-foreground">{demandeTexte.replace(/\*\*/g, '')}</p>}
          {captcha && (
            <>
              <p className="text-sm leading-relaxed text-foreground">
                Tu la vois sur l&apos;écran de l&apos;agent ci-dessous. Elle se trouve dans le navigateur de
                l&apos;agent : tu ne peux pas la cocher d&apos;ici. Dis-lui de passer à l&apos;annonce suivante, ou
                regarde l&apos;annonce toi-même.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  disabled={envoi}
                  onClick={() => envoyer(MESSAGE_PASSER)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {envoi ? <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
                  Passer cette annonce
                </button>
                {vue?.observation?.url && (
                  <a
                    href={vue.observation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Ouvrir l&apos;annonce moi-même
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>
            </>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">
              {source === 'logement' ? "Ta réponse à l'agent" : source === 'caf' ? 'Ta réponse (le code reçu par e-mail de la CAF, une info manquante…)' : 'Ta réponse (ton e-mail, le code reçu…)'}
            </span>
            <div className="flex gap-2">
              <input
                value={reponse}
                onChange={(e) => setReponse(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void envoyer(reponse)
                }}
                className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-base outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
              />
              <button
                type="button"
                disabled={envoi}
                onClick={() => envoyer(reponse)}
                aria-label="Envoyer la réponse"
                className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {envoi ? <Loader2 className="size-4 motion-safe:animate-spin" /> : <Send className="size-4" aria-hidden="true" />}
              </button>
            </div>
          </label>
          {source !== 'logement' && vue?.observation?.url && (
            <p className="text-sm text-muted-foreground">
              Ton mot de passe reste à toi. Tu peux aussi faire cette étape toi-même :{' '}
              <a
                href={vue.observation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
              >
                ouvrir {site}
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
              , puis dis à l&apos;agent « c&apos;est fait ».
            </p>
          )}
          {!captcha && (
            <button
              type="button"
              onClick={() => envoyer("C'est fait, tu peux continuer.")}
              className="self-start text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              C&apos;est fait : l&apos;agent peut continuer
            </button>
          )}
        </section>
      )}
      {envoye && !attend && <p className="text-sm font-medium text-success">Réponse envoyée, l&apos;agent reprend.</p>}
      {erreur && (
        <p role="alert" className="text-sm font-medium text-danger">
          {erreur}
        </p>
      )}

      <figure className="overflow-hidden rounded-2xl bg-card shadow-carte">
        {vue?.observation?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vue.observation.image}
            alt={`Écran de l'agent${vue.observation.titre ? ` : ${vue.observation.titre}` : ''}`}
            className="block h-auto w-full"
          />
        ) : (
          <p className="p-10 text-center text-muted-foreground">L&apos;écran de l&apos;agent va s&apos;afficher ici.</p>
        )}
        <figcaption className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          Ce que voit l&apos;agent, mis à jour toutes les quelques secondes.
        </figcaption>
      </figure>

      {vue && vue.messages.length > 0 && (
        <section aria-label="Ce que dit l'agent" className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground">Ce que fait l&apos;agent</h2>
          <ul className="flex flex-col gap-2">
            {vue.messages.map((m, i) => (
              <li key={i} className="whitespace-pre-line rounded-xl bg-muted px-3 py-2 text-sm text-foreground">
                {m.replace(/\*\*/g, '')}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
