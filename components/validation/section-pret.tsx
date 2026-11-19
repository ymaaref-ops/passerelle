'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Award, ChevronDown, ExternalLink, Landmark, Loader2, RefreshCw } from 'lucide-react'
import { DEMARCHES, formaterEurosCentimes, type DemarcheId, type EnvoisParDemarche } from '@/lib/validation'
import { lancerDemarches, lireEtat } from '@/lib/n8n'
import { cn } from '@/lib/utils'
import { BoutonEnvoi } from './bouton-envoi'

interface SectionPretProps {
  envois: EnvoisParDemarche
  onEnvoyer: (id: DemarcheId) => void
}

/** Une ligne du comparatif renvoyé par l'agent « comparateur-pret ». */
interface ResultatBanque {
  banque: string
  statut: string
  mensualite: number | null
  taeg: number | null
  cout_total_credit: number | null
  montant_total_du: number | null
  frais_dossier: number | null
  page_source: string | null
  raison_si_echec: string | null
}

interface Comparatif {
  statut: string
  resultats: ResultatBanque[]
  remarques: string[]
  lien: string | null
}

interface Capture {
  site: string
  image: string
  titre: string | null
}

const STATUTS_EN_COURS = ['en_cours', 'proposee']

/** Banque du comparatif → démarche de l'interface (bouton « Aller sur le site »). */
function demarcheDe(banque: string): DemarcheId | null {
  const b = banque.toLowerCase()
  if (b.includes('postale')) return 'banque-postale'
  if (b.includes('société') || b.includes('societe') || b.includes('sg')) return 'societe-generale'
  if (b.includes('cic')) return 'cic'
  return null
}

function nombre(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(',', '.').replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

function lireComparatif(d: {
  statut: string
  resultat_agent: Record<string, unknown> | null
}): Comparatif {
  const r = (d.resultat_agent ?? {}) as Record<string, unknown>
  const reponse = (r.reponse ?? {}) as Record<string, unknown>
  const brut = Array.isArray(reponse.resultats) ? (reponse.resultats as Record<string, unknown>[]) : []
  const remarques = Array.isArray(reponse.remarques)
    ? (reponse.remarques as unknown[]).map(String)
    : typeof reponse.remarques === 'string'
      ? [reponse.remarques]
      : []
  return {
    statut: d.statut,
    lien: typeof r.lien_public === 'string' ? r.lien_public : null,
    remarques,
    resultats: brut.map((x) => ({
      banque: String(x.banque ?? 'Banque'),
      statut: String(x.statut ?? ''),
      mensualite: nombre(x.mensualite),
      taeg: nombre(x.taeg),
      cout_total_credit: nombre(x.cout_total_credit),
      montant_total_du: nombre(x.montant_total_du),
      frais_dossier: nombre(x.frais_dossier),
      page_source: typeof x.page_source === 'string' && x.page_source.startsWith('http') ? x.page_source : null,
      raison_si_echec: x.raison_si_echec ? String(x.raison_si_echec) : null,
    })),
  }
}

/** Dernière capture prise par l'agent sur chaque site visité (hors moteur de recherche). */
async function lireCaptures(lien: string): Promise<Capture[]> {
  if (!lien.startsWith('https://agp.eu.hcompany.ai/share/')) return []
  const t = (await fetch(lien, { cache: 'no-store' }).then((r) => r.json())) as {
    events?: { data?: { event?: Record<string, any> } }[]
  }
  const parSite = new Map<string, Capture>()
  for (const e of t.events ?? []) {
    const ev = e.data?.event
    if (ev?.kind !== 'observation_event' || !ev.observation?.image?.source) continue
    let site = ''
    try {
      site = new URL(ev.observation.url).host
    } catch {
      continue
    }
    if (/bing\.com|google\.|duckduckgo/.test(site)) continue
    parSite.set(site, { site, image: ev.observation.image.source, titre: ev.observation.title ?? null })
  }
  return [...parSite.values()]
}

function useComparatif() {
  const [comparatif, setComparatif] = useState<Comparatif | null | undefined>(undefined)
  const [captures, setCaptures] = useState<Capture[]>([])
  const [tour, setTour] = useState(0)

  useEffect(() => {
    let actif = true
    let minuteur: number | null = null
    async function lire() {
      try {
        const etat = await lireEtat()
        const d = etat.demarches?.find((x) => x.aide_code === 'pret_garanti')
        if (!actif) return
        if (!d) {
          setComparatif(null)
          return
        }
        const c = lireComparatif(d as unknown as { statut: string; resultat_agent: Record<string, unknown> | null })
        setComparatif(c)
        if (c.lien) lireCaptures(c.lien).then((l) => actif && setCaptures(l)).catch(() => undefined)
        if (STATUTS_EN_COURS.includes(c.statut)) minuteur = window.setTimeout(lire, 15000)
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

  return { comparatif, captures, relire: () => setTour((t) => t + 1) }
}

export function SectionPret({ envois, onEnvoyer }: SectionPretProps) {
  const { comparatif, captures, relire } = useComparatif()
  const [relance, setRelance] = useState<'non' | 'en_cours' | 'faite'>('non')
  const [erreur, setErreur] = useState<string | null>(null)

  const enCours = comparatif ? STATUTS_EN_COURS.includes(comparatif.statut) : false
  const reussis = (comparatif?.resultats ?? []).filter((r) => r.statut !== 'echec' && r.mensualite !== null)
  const echecs = (comparatif?.resultats ?? []).filter((r) => r.statut === 'echec' || r.mensualite === null)
  const meilleure = reussis.reduce<ResultatBanque | null>(
    (m, r) =>
      r.cout_total_credit !== null && (m === null || (m.cout_total_credit ?? Infinity) > r.cout_total_credit) ? r : m,
    null,
  )

  async function relancer() {
    setErreur(null)
    setRelance('en_cours')
    try {
      await lancerDemarches(['pret-etat', 'pret-lbp', 'pret-sg', 'pret-cic'])
      setRelance('faite')
      relire()
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La comparaison n'a pas pu être relancée.")
      setRelance('non')
    }
  }

  return (
    <details open className="group rounded-3xl bg-card shadow-carte">
      <summary className="flex cursor-pointer list-none items-center gap-4 rounded-3xl p-5 outline-none focus-visible:ring-4 focus-visible:ring-ring/30 sm:p-6 [&::-webkit-details-marker]:hidden">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Landmark className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold leading-snug text-foreground">Prêt étudiant</h2>
          <p className="text-sm text-muted-foreground">Comparatif fait par l&apos;agent sur les sites des banques</p>
        </div>
        <ChevronDown
          className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
        <span className="sr-only">Afficher ou masquer le comparatif des prêts</span>
      </summary>

      <div className="flex flex-col gap-6 border-t border-border p-5 sm:p-6">
        {comparatif === undefined && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" />
            Chargement du comparatif…
          </p>
        )}
        {comparatif === null && (
          <p className="text-muted-foreground">Tu n&apos;as pas demandé de comparaison de prêts.</p>
        )}
        {comparatif && enCours && (
          <p className="flex items-center gap-2 font-medium text-foreground">
            <Loader2 className="size-5 text-primary motion-safe:animate-spin" aria-hidden="true" />
            L&apos;agent compare les banques. Il démarre après la simulation CAF, ça peut prendre une dizaine de
            minutes.
          </p>
        )}

        {comparatif && !enCours && reussis.length > 0 && (
          <ul className="flex flex-col gap-4">
            {reussis.map((r) => {
              const id = demarcheDe(r.banque)
              const top = meilleure === r
              return (
                <li
                  key={r.banque}
                  className={cn(
                    'flex flex-col gap-4 rounded-2xl border p-4',
                    top ? 'border-step-green-border bg-step-green-soft' : 'border-border bg-background',
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-foreground">{r.banque}</h3>
                    {top && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-step-green px-3 py-1 text-sm font-semibold text-white">
                        <Award className="size-4" aria-hidden="true" />
                        Moins chère au total
                      </span>
                    )}
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                    <div>
                      <dt className="text-sm text-muted-foreground">Mensualité</dt>
                      <dd className="font-semibold text-foreground">
                        {r.mensualite !== null ? formaterEurosCentimes(r.mensualite) : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">TAEG</dt>
                      <dd className="font-semibold text-foreground">
                        {r.taeg !== null ? `${r.taeg.toLocaleString('fr-FR')} %` : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Coût du crédit</dt>
                      <dd className="font-semibold text-foreground">
                        {r.cout_total_credit !== null ? formaterEurosCentimes(r.cout_total_credit) : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Frais de dossier</dt>
                      <dd className="font-semibold text-foreground">
                        {r.frais_dossier !== null ? formaterEurosCentimes(r.frais_dossier) : '—'}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap items-center gap-3">
                    {id && <BoutonEnvoi demarche={DEMARCHES[id]} envoyeeLe={envois[id]} onEnvoyer={onEnvoyer} />}
                    {r.page_source && (
                      <a
                        href={r.page_source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        Page du simulateur
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {comparatif && !enCours && echecs.length > 0 && (
          <div className="flex flex-col gap-2 rounded-2xl border border-step-orange-border bg-step-orange-soft p-4">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              <AlertTriangle className="size-5 text-step-orange" aria-hidden="true" />
              {reussis.length === 0 ? "L'agent n'a pas pu simuler les prêts" : 'Certaines banques n’ont pas pu être simulées'}
            </p>
            <ul className="flex flex-col gap-1 text-sm text-foreground">
              {echecs.map((r) => (
                <li key={r.banque}>
                  <strong>{r.banque}</strong> : {r.raison_si_echec ?? 'pas de résultat'}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={relancer}
              disabled={relance !== 'non'}
              className="mt-1 inline-flex h-10 items-center gap-2 self-start rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {relance === 'en_cours' ? (
                <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="size-4" aria-hidden="true" />
              )}
              {relance === 'faite' ? 'Comparaison relancée' : 'Relancer la comparaison'}
            </button>
            {erreur && (
              <p role="alert" className="text-sm font-medium text-danger">
                {erreur}
              </p>
            )}
          </div>
        )}

        {comparatif && !enCours && comparatif.resultats.length === 0 && comparatif.remarques.length > 0 && (
          <p className="text-sm text-muted-foreground">{comparatif.remarques.join(' ')}</p>
        )}

        {comparatif && (
          <div>
            <h3 className="text-base font-bold text-foreground">Captures des simulateurs</h3>
            {captures.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {enCours
                  ? "Les captures apparaîtront ici pendant que l'agent visite les sites des banques."
                  : "L'agent n'a pas pris de capture des sites des banques pour cette comparaison."}
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                {captures.map((c) => (
                  <figure key={c.site} className="flex flex-col gap-2">
                    <a
                      href={c.image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="overflow-hidden rounded-2xl bg-card shadow-carte"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.image} alt={`Capture du site ${c.site}`} className="block h-auto w-full" />
                    </a>
                    <figcaption className="text-xs text-muted-foreground">{c.titre ?? c.site}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </details>
  )
}
