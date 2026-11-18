'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, ExternalLink, Home, Loader2, Search, Send } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  lancerRecherche,
  lireRecherche,
  repondreAgent,
  texteReponse,
  type EtatRecherche,
  type Logement,
} from '@/lib/logement'
import { getEtudiantId } from '@/lib/n8n'
import { lireSituation } from '@/lib/session'
import { cn } from '@/lib/utils'

const TYPES = ['Studio', 'T1', 'Colocation', 'Résidence étudiante', 'Peu importe']
const TERMINAUX = ['completed', 'failed', 'timed_out', 'interrupted']
const INTERVALLE_MS = 5000

const ETIQUETTES: Record<string, { label: string; classe: string }> = {
  eligible: { label: 'Aide possible', classe: 'bg-success-soft text-success' },
  a_verifier: { label: 'À vérifier', classe: 'bg-step-orange-soft text-step-orange' },
  non_eligible: { label: 'Sans aide', classe: 'bg-muted text-muted-foreground' },
  deja_loue: { label: 'Déjà loué', classe: 'bg-muted text-muted-foreground' },
}

const euros = (v: number | null | undefined) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? '—' : `${Math.round(Number(v))} €`
const liste = (v: string | string[] | null | undefined) => (Array.isArray(v) ? v : v ? [v] : [])

function CarteLogement({ l }: { l: Logement }) {
  const etiquette = ETIQUETTES[l.eligibilite ?? ''] ?? null
  const alertes = liste(l.alertes)
  return (
    <li className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-foreground">
          {l.rang ? `${l.rang}. ` : ''}
          {l.titre ?? 'Logement'}
        </h3>
        {etiquette && (
          <span className={cn('rounded-full px-3 py-1 text-sm font-semibold', etiquette.classe)}>{etiquette.label}</span>
        )}
      </div>
      <p className="text-base text-foreground">
        {euros(l.loyer_charges_comprises)} charges comprises − {euros(l.aide_mensuelle)} d&apos;aide CAF ={' '}
        <span className="text-xl font-bold text-primary">{euros(l.reste_a_payer)}/mois</span>
      </p>
      {l.dans_budget !== null && l.dans_budget !== undefined && (
        <p className={cn('text-sm font-semibold', l.dans_budget ? 'text-success' : 'text-step-orange')}>
          {l.dans_budget ? 'Dans ton budget' : 'Hors budget'}
        </p>
      )}
      {liste(l.raisons).length > 0 && (
        <p className="text-sm text-muted-foreground">{liste(l.raisons).join(' · ')}</p>
      )}
      {alertes.length > 0 && (
        <p className="flex items-start gap-2 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {alertes.join(' · ')}
        </p>
      )}
      {l.url && (
        <a
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Voir l&apos;annonce
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      )}
    </li>
  )
}

export function RechercheLogement() {
  const [ville, setVille] = useState('')
  const [budget, setBudget] = useState('')
  const [type, setType] = useState('Studio')
  const [meuble, setMeuble] = useState('Peu importe')
  const [dateEntree, setDateEntree] = useState('')
  const [liens, setLiens] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [etat, setEtat] = useState<EtatRecherche | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [reponse, setReponse] = useState('')
  const minuteur = useRef<number | null>(null)

  useEffect(() => () => {
    if (minuteur.current) window.clearTimeout(minuteur.current)
  }, [])

  const termine = etat ? TERMINAUX.includes(etat.statut) : false
  const enAttenteDeToi = etat?.statut === 'idle' && !etat.logements?.length
  const enCours = sessionId !== null && !termine && !(etat?.statut === 'idle' && etat.logements?.length)

  function suivre(id: string) {
    minuteur.current = window.setTimeout(async () => {
      try {
        const e = await lireRecherche(id)
        setEtat(e)
        if (TERMINAUX.includes(e.statut) || (e.statut === 'idle' && e.logements?.length)) return
      } catch {
        // On réessaie au prochain passage.
      }
      suivre(id)
    }, INTERVALLE_MS)
  }

  async function chercher() {
    setErreur(null)
    setEnvoi(true)
    setEtat(null)
    try {
      const situation = lireSituation()
      const { session_id } = await lancerRecherche(
        {
          ville: ville.trim(),
          budget: Number(budget),
          type,
          meuble,
          date_entree: dateEntree || 'dès que possible',
          boursier: situation ? { oui: 'oui', non: 'non', ne_sais_pas: 'ne sait pas' }[situation.bourse] : undefined,
          revenus: situation?.ressources ?? null,
          liens: liens.split(/\s+/).filter((l) => l.startsWith('http')),
        },
        getEtudiantId(),
      )
      setSessionId(session_id)
      suivre(session_id)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La recherche n'a pas pu démarrer.")
    } finally {
      setEnvoi(false)
    }
  }

  async function envoyerReponse() {
    if (!sessionId || !reponse.trim()) return
    try {
      await repondreAgent(sessionId, reponse.trim())
      setReponse('')
      setEtat((e) => (e ? { ...e, statut: 'running' } : e))
      if (minuteur.current) window.clearTimeout(minuteur.current)
      suivre(sessionId)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Ta réponse n'a pas pu être envoyée.")
    }
  }

  const peutChercher = ville.trim() !== '' && Number(budget) > 0 && !envoi && !enCours
  const champ =
    'h-12 rounded-xl border border-border bg-background px-4 text-base outline-none focus-visible:ring-4 focus-visible:ring-ring/30'
  const texte = texteReponse(etat?.reponse)

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-5 rounded-3xl border-2 border-step-violet-border bg-step-violet-soft p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="font-medium text-foreground">Ville ou quartiers</span>
            <input value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Paris 13e" className={champ} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-medium text-foreground">Budget maximum après aide (€/mois)</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="750"
              className={champ}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-medium text-foreground">Type de logement</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className={champ}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-medium text-foreground">Meublé</span>
            <select value={meuble} onChange={(e) => setMeuble(e.target.value)} className={champ}>
              {['Peu importe', 'Oui', 'Non'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-medium text-foreground">Date d&apos;entrée</span>
            <input type="date" value={dateEntree} onChange={(e) => setDateEntree(e.target.value)} className={champ} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-medium text-foreground">Liens d&apos;annonces (facultatif)</span>
            <input
              value={liens}
              onChange={(e) => setLiens(e.target.value)}
              placeholder="https://www.pap.fr/annonce/…"
              className={champ}
            />
          </label>
        </div>
        <p className="text-sm text-muted-foreground">
          L&apos;agent cherche des annonces, estime ton aide au logement pour chacune et calcule ce que tu
          paieras vraiment. Il ne contacte jamais de propriétaire.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={chercher}
            disabled={!peutChercher}
            className={cn(
              buttonVariants({ size: 'lg' }),
              'h-12 gap-2 rounded-2xl bg-step-violet px-6 text-base font-semibold text-white hover:bg-step-violet/90 disabled:cursor-not-allowed',
            )}
          >
            {envoi ? <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" /> : <Search className="size-5" aria-hidden="true" />}
            {enCours ? 'Recherche en cours…' : 'Lancer la recherche'}
          </button>
          {!peutChercher && !enCours && (
            <p className="text-sm text-muted-foreground">Indique au moins la ville et ton budget.</p>
          )}
        </div>
        {erreur && (
          <p role="alert" className="text-sm font-medium text-danger">
            {erreur}
          </p>
        )}
      </section>

      {sessionId && (
        <section aria-live="polite" className="flex flex-col gap-4">
          {enCours && !enAttenteDeToi && (
            <p className="flex items-center gap-2 rounded-3xl border border-border bg-card p-5 text-foreground">
              <Loader2 className="size-5 shrink-0 text-step-violet motion-safe:animate-spin" aria-hidden="true" />
              L&apos;agent cherche des logements et simule ton aide pour chacun… Ça prend quelques minutes.
            </p>
          )}

          {enAttenteDeToi && (
            <div className="flex flex-col gap-3 rounded-3xl border-2 border-step-orange bg-step-orange-soft p-5">
              <p className="font-bold text-foreground">L&apos;agent a besoin de toi</p>
              {texte && <p className="whitespace-pre-line text-foreground">{texte}</p>}
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={reponse}
                  onChange={(e) => setReponse(e.target.value)}
                  placeholder="Ta réponse"
                  className={cn(champ, 'flex-1')}
                />
                <button
                  type="button"
                  onClick={envoyerReponse}
                  className={cn(buttonVariants({ size: 'lg' }), 'h-12 gap-2 rounded-2xl px-5 font-semibold')}
                >
                  <Send className="size-4" aria-hidden="true" />
                  Répondre
                </button>
              </div>
              {etat?.lien && (
                <a
                  href={etat.lien}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-primary hover:underline"
                >
                  Ouvrir la fenêtre de l&apos;agent
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              )}
            </div>
          )}

          {etat?.logements && etat.logements.length > 0 && (
            <>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-primary">
                <Home className="size-6" aria-hidden="true" />
                {etat.logements.length} logement{etat.logements.length > 1 ? 's' : ''} trouvé
                {etat.logements.length > 1 ? 's' : ''}
              </h2>
              <ul className="grid gap-4 md:grid-cols-2">
                {etat.logements.map((l, i) => (
                  <CarteLogement key={l.url ?? i} l={l} />
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                Ces aides sont des estimations : la CAF décide après ta demande. C&apos;est toi qui contactes le
                propriétaire. Ne paie jamais avant d&apos;avoir visité et signé un bail.
              </p>
              <Link
                href="/situation"
                className={cn(buttonVariants({ size: 'lg' }), 'h-12 gap-2 self-start rounded-2xl px-6 font-semibold')}
              >
                Logement trouvé ? Découvrir mes aides
              </Link>
            </>
          )}

          {termine && !etat?.logements?.length && (
            <p className="rounded-3xl border border-border bg-card p-5 text-foreground">
              {texte || "L'agent n'a pas trouvé de logement cette fois. Essaie avec un budget ou un quartier différent."}
            </p>
          )}
        </section>
      )}

      <Link
        href="/demarrer"
        className="inline-flex items-center gap-2 self-start text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Revenir au choix
      </Link>
    </div>
  )
}
