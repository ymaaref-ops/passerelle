'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, ChevronDown, ExternalLink, Home, Loader2, MapPin, Search, Send } from 'lucide-react'
import { ChargementEtudiant } from '@/components/chargement-etudiant'
import { MorpionEtudes } from '@/components/morpion-etudes'
import { buttonVariants } from '@/components/ui/button'
import {
  lancerRecherche,
  lireRecherche,
  repondreAgent,
  texteReponse,
  type EtatRecherche,
  type Logement,
} from '@/lib/logement'
import { adresseFenetre, ouvrirFenetre } from '@/lib/fenetre'
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

function nombreOuNull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(',', '.').replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Site de l'annonce : celui donné par l'agent, sinon le nom de domaine du lien. */
function siteDe(l: Logement): string | null {
  if (l.site) return l.site
  try {
    return l.url ? new URL(l.url).hostname.replace(/^www\./, '') : null
  } catch {
    return null
  }
}

/** Photo de l'annonce ; si elle ne se charge pas (ou n'existe pas), une petite illustration. */
function PhotoLogement({ src, titre }: { src?: string | null; titre: string }) {
  const [rate, setRate] = useState(false)
  if (src && /^https:\/\//.test(src) && !rate) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`Photo : ${titre}`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setRate(true)}
        className="h-full w-full object-cover"
      />
    )
  }
  return (
    <svg viewBox="0 0 160 110" className="h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="110" className="fill-primary-soft" />
      <circle cx="128" cy="26" r="11" className="fill-card" />
      <polygon points="38,58 80,26 122,58" className="fill-primary" />
      <rect x="48" y="56" width="64" height="40" className="fill-card" />
      <rect x="73" y="70" width="14" height="26" rx="2" className="fill-step-blue" />
      <rect x="55" y="64" width="11" height="11" rx="1" className="fill-step-blue/30" />
      <rect x="94" y="64" width="11" height="11" rx="1" className="fill-step-blue/30" />
      <rect y="96" width="160" height="14" className="fill-step-blue/15" />
    </svg>
  )
}

function Info({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-foreground">
      {children}
    </span>
  )
}

function CarteLogement({ l }: { l: Logement }) {
  const [ouvert, setOuvert] = useState(false)
  const etiquette = ETIQUETTES[l.eligibilite ?? ''] ?? null
  const alertes = liste(l.alertes)
  const raisons = liste(l.raisons)
  const equipements = liste(l.equipements)
  const titre = l.titre ?? 'Logement'
  const surface = nombreOuNull(l.surface_m2)
  const pieces = nombreOuNull(l.pieces)
  const meuble = l.meuble === true || /^oui/i.test(String(l.meuble ?? '')) ? 'Meublé' : l.meuble === false || /^non/i.test(String(l.meuble ?? '')) ? 'Non meublé' : null
  const site = siteDe(l)

  return (
    <li className="flex flex-col overflow-hidden rounded-3xl bg-card shadow-carte">
      <div className="relative h-44 bg-primary-soft">
        <PhotoLogement src={l.photo} titre={titre} />
        {etiquette && (
          <span className={cn('absolute top-3 left-3 rounded-full px-3 py-1 text-sm font-semibold shadow-sm', etiquette.classe)}>
            {etiquette.label}
          </span>
        )}
        {l.dans_budget !== null && l.dans_budget !== undefined && (
          <span
            className={cn(
              'absolute top-3 right-3 rounded-full px-3 py-1 text-sm font-semibold shadow-sm',
              l.dans_budget ? 'bg-success text-white' : 'bg-step-orange text-white',
            )}
          >
            {l.dans_budget ? 'Dans ton budget' : 'Hors budget'}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-lg font-bold leading-snug text-foreground">
            {l.rang ? `${l.rang}. ` : ''}
            {titre}
          </h3>
          {l.adresse && (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              {l.adresse}
            </p>
          )}
        </div>

        {(surface || pieces || meuble) && (
          <div className="flex flex-wrap gap-1.5">
            {surface && <Info>{surface} m²</Info>}
            {pieces && <Info>{pieces} pièce{pieces > 1 ? 's' : ''}</Info>}
            {meuble && <Info>{meuble}</Info>}
          </div>
        )}

        <div className="flex items-end justify-between gap-3 rounded-2xl bg-muted p-3">
          <div>
            <p className="text-xs text-muted-foreground">Tu paieras</p>
            <p className="text-2xl font-extrabold text-primary">
              {euros(l.reste_a_payer)}
              <span className="text-sm font-bold">/mois</span>
            </p>
          </div>
          <p className="text-right text-xs text-muted-foreground">
            Loyer {euros(l.loyer_charges_comprises)} CC
            <br />− aide CAF {euros(l.aide_mensuelle)}
          </p>
        </div>

        <button
          type="button"
          aria-expanded={ouvert}
          onClick={() => setOuvert((o) => !o)}
          className="mt-auto flex items-center justify-between rounded-xl text-sm font-semibold text-step-blue outline-none hover:underline focus-visible:ring-4 focus-visible:ring-ring/30"
        >
          {ouvert ? 'Moins d’infos' : 'Plus d’infos'}
          <ChevronDown className={cn('size-4 transition-transform', ouvert && 'rotate-180')} aria-hidden="true" />
        </button>

        {ouvert && (
          <div className="flex flex-col gap-3 border-t border-foreground/10 pt-3 text-sm">
            {l.description && <p className="leading-relaxed text-foreground">{l.description}</p>}
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
              <dt className="text-muted-foreground">Loyer charges comprises</dt>
              <dd className="font-semibold text-foreground">{euros(l.loyer_charges_comprises)}</dd>
              <dt className="text-muted-foreground">Aide au logement estimée</dt>
              <dd className="font-semibold text-foreground">{euros(l.aide_mensuelle)}</dd>
              {l.disponible_le && (
                <>
                  <dt className="text-muted-foreground">Disponible</dt>
                  <dd className="font-semibold text-foreground">{l.disponible_le}</dd>
                </>
              )}
              {site && (
                <>
                  <dt className="text-muted-foreground">Annonce sur</dt>
                  <dd className="font-semibold text-foreground">{site}</dd>
                </>
              )}
            </dl>
            {equipements.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {equipements.map((e) => (
                  <Info key={e}>{e}</Info>
                ))}
              </div>
            )}
            {raisons.length > 0 && <p className="text-muted-foreground">{raisons.join(' · ')}</p>}
            {alertes.length > 0 && (
              <p className="flex items-start gap-2 text-danger">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {alertes.join(' · ')}
              </p>
            )}
            {l.url && (
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center gap-1.5 self-start rounded-full bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Voir l&apos;annonce
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            )}
          </div>
        )}
      </div>
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
      <section className="flex flex-col gap-5 rounded-3xl bg-card p-5 shadow-carte sm:p-6">
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
              'h-12 gap-2 rounded-full px-6 text-base font-semibold disabled:cursor-not-allowed',
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
            <>
              <div className="flex items-center gap-4 rounded-3xl bg-card p-5 shadow-carte">
                <ChargementEtudiant taille={56} />
                <div>
                  <p className="font-bold text-foreground">L&apos;agent visite les annonces pour toi…</p>
                  <p className="text-sm text-muted-foreground">
                    Il cherche des logements et simule ton aide pour chacun. Ça prend quelques minutes.
                  </p>
                </div>
              </div>
              <MorpionEtudes
                titre="Pendant la recherche, un morpion contre le robot ?"
                note="L'agent continue de chercher pendant que tu joues : les logements s'affichent ici dès qu'il a fini."
              />
            </>
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
                <button
                  type="button"
                  onClick={() => ouvrirFenetre(adresseFenetre(sessionId ?? '', etat.lien as string, 'logement'))}
                  className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/30"
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                  Ouvrir la fenêtre de l&apos;agent
                </button>
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
              <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
            <p className="rounded-3xl bg-card shadow-carte p-5 text-foreground">
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
