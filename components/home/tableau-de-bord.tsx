'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, CircleAlert, FileText, FileUp, Loader2, Trophy } from 'lucide-react'
import { StatutBadge } from '@/components/agents/statut-badge'
import { ETAPES, Parcours } from '@/components/progress-steps'
import { getStatutsAgents, type AgentStatut } from '@/lib/agents'
import { lireMonCompte, sessionCourante, type MonCompte } from '@/lib/compte'
import { lireEtat, type DemarcheN8n } from '@/lib/n8n'
import { lireSituation } from '@/lib/session'
import { cn } from '@/lib/utils'

interface Donnees {
  compte: MonCompte | null
  demarches: DemarcheN8n[]
  agents: AgentStatut[]
}

const LIBELLE_DEMARCHE: Record<string, string> = {
  apl: 'APL',
  prime_activite: "Prime d'activité",
  pret_garanti: 'Prêt étudiant',
  visale: 'Visale',
  mobili_jeune: 'Mobili-Jeune',
  bourse_crous: 'Bourse Crous',
}

const LIBELLE_STATUT: Record<string, string> = {
  en_cours: 'Agent en action',
  connexion_requise: 'Connexion à faire',
  pret_a_valider: 'Prête à valider',
  envoyee: 'Envoyée',
  proposee: 'Proposée',
}

function nombre(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** « Aujourd'hui · 14h32 », « Hier · 16h45 » ou « 12 nov. · 10h05 ». */
function quand(iso: string): string {
  const d = new Date(iso)
  const heure = `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`
  const jour = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const ecart = Math.round((jour(new Date()) - jour(d)) / 86_400_000)
  if (ecart === 0) return `Aujourd'hui · ${heure}`
  if (ecart === 1) return `Hier · ${heure}`
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${heure}`
}

/** Où en est l'étudiant dans le parcours (index dans ETAPES). */
function etapeCourante({ compte, demarches }: Donnees): number {
  const lancees = demarches.filter((d) => d.cochee && d.statut !== 'proposee')
  if (lancees.some((d) => ['pret_a_valider', 'connexion_requise', 'envoyee'].includes(d.statut))) return 5
  if (lancees.length > 0) return 4
  if (compte?.documents.length) return compte.eligibilite.length ? 3 : 2
  if (compte?.situation || lireSituation()) return 1
  return 0
}

/** Illustration de l'en-tête : une résidence étudiante stylisée. */
function Residence() {
  return (
    <svg viewBox="0 0 420 220" className="h-full w-full" aria-hidden="true" preserveAspectRatio="xMaxYMax slice">
      <defs>
        <linearGradient id="ciel" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="oklch(0.86 0.07 270)" />
          <stop offset="1" stopColor="oklch(0.95 0.03 285)" />
        </linearGradient>
        <linearGradient id="facade" x1="0" x2="1">
          <stop offset="0" stopColor="oklch(0.97 0.01 285)" />
          <stop offset="1" stopColor="oklch(0.88 0.03 285)" />
        </linearGradient>
      </defs>
      <rect width="420" height="220" fill="url(#ciel)" />
      <circle cx="350" cy="50" r="26" fill="oklch(0.99 0.02 90)" opacity="0.8" />
      <polygon points="120,220 120,70 330,40 420,60 420,220" fill="url(#facade)" />
      <polygon points="330,40 420,60 420,220 330,220" fill="oklch(0.8 0.04 285)" />
      {[0, 1, 2, 3, 4].map((r) =>
        [0, 1, 2, 3, 4, 5].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={135 + c * 32}
            y={84 + r * 26 - c * 3}
            width="22"
            height="16"
            rx="2"
            fill={(r + c) % 3 === 0 ? 'oklch(0.55 0.12 270)' : 'oklch(0.42 0.1 272)'}
            opacity="0.9"
          />
        )),
      )}
      {[0, 1, 2, 3, 4].map((r) => (
        <rect key={r} x="345" y={78 + r * 27} width="60" height="15" rx="2" fill="oklch(0.38 0.09 272)" opacity="0.8" />
      ))}
      <ellipse cx="95" cy="160" rx="42" ry="58" fill="oklch(0.55 0.13 150)" />
      <ellipse cx="70" cy="185" rx="30" ry="40" fill="oklch(0.48 0.12 150)" />
      <rect x="92" y="190" width="6" height="30" fill="oklch(0.4 0.05 60)" />
      <rect y="212" width="420" height="8" fill="oklch(0.8 0.03 285)" />
    </svg>
  )
}

function Maison() {
  return (
    <svg viewBox="0 0 160 110" className="h-24 w-36 shrink-0" aria-hidden="true">
      <ellipse cx="60" cy="70" rx="40" ry="30" fill="oklch(0.95 0.025 285)" />
      <ellipse cx="110" cy="62" rx="34" ry="28" fill="oklch(0.95 0.025 285)" />
      <polygon points="40,62 82,28 124,62" fill="oklch(0.3 0.13 275)" />
      <rect x="50" y="60" width="64" height="40" fill="oklch(0.86 0.06 285)" />
      <rect x="74" y="74" width="16" height="26" rx="2" fill="oklch(0.5 0.2 278)" />
      <rect x="56" y="68" width="12" height="12" rx="1" fill="oklch(0.97 0.01 285)" />
      <rect x="96" y="68" width="12" height="12" rx="1" fill="oklch(0.97 0.01 285)" />
      <circle cx="132" cy="84" r="9" fill="oklch(0.5 0.2 278)" />
      <rect x="131" y="88" width="2" height="12" fill="oklch(0.3 0.13 275)" />
      <rect x="20" y="99" width="130" height="3" rx="1.5" fill="oklch(0.88 0.04 285)" />
    </svg>
  )
}

function Carte({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn('rounded-3xl bg-card p-6 shadow-carte sm:p-7', className)}>{children}</section>
}

function LienCarte({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-step-blue hover:underline">
      {children}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  )
}

/** Accueil de l'étudiant connecté : où il en est, ses aides, ses démarches et son activité. */
export function TableauDeBord() {
  const [donnees, setDonnees] = useState<Donnees | null>(null)
  const prenom = sessionCourante()?.prenom ?? ''

  useEffect(() => {
    let actif = true
    Promise.all([
      lireMonCompte().catch(() => null),
      lireEtat()
        .then((e) => e.demarches ?? [])
        .catch(() => [] as DemarcheN8n[]),
      getStatutsAgents().catch(() => [] as AgentStatut[]),
    ]).then(([compte, demarches, agents]) => {
      if (actif) setDonnees({ compte, demarches, agents })
    })
    return () => {
      actif = false
    }
  }, [])

  const index = donnees ? etapeCourante(donnees) : -1
  const suite = ETAPES[Math.max(0, index)]
  const nom = donnees?.compte?.profil?.prenom || donnees?.compte?.prenom || prenom

  // Aides estimées : l'APL simulée par l'agent, sinon celle calculée sur les documents.
  const aplAgent = nombre(donnees?.demarches.find((d) => d.aide_code === 'apl')?.montant_estime)
  const aplCalculee = nombre(donnees?.compte?.eligibilite.find((e) => e.aide_code === 'apl')?.montant_estime)
  const apl = aplAgent ?? aplCalculee
  const nbEligibles = donnees?.compte?.eligibilite.filter((e) => e.eligibilite === 'eligible').length ?? 0

  const documents = donnees?.compte?.documents ?? []
  const aCorriger = documents.flatMap((d) => (d.anomalies ?? []).filter((a) => a.gravite === 'bloquante')).length
  const enCours = (donnees?.agents ?? []).filter((a) => a.statut !== 'attente')

  const activite: { date: string; texte: string }[] = []
  if (donnees?.compte?.inscrit_le) activite.push({ date: donnees.compte.inscrit_le, texte: 'Compte créé' })
  const dernierDepot = documents.map((d) => d.created_at).filter(Boolean).sort().pop()
  if (dernierDepot) activite.push({ date: dernierDepot, texte: aCorriger ? 'Documents déposés' : 'Documents validés' })
  for (const d of donnees?.demarches ?? []) {
    if (!d.updated_at || !d.cochee || d.statut === 'proposee') continue
    activite.push({
      date: d.updated_at,
      texte: `${LIBELLE_DEMARCHE[d.aide_code] ?? d.aide_code} : ${(LIBELLE_STATUT[d.statut] ?? d.statut).toLowerCase()}`,
    })
  }
  activite.sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-4 sm:px-6 lg:px-10">
      {/* En-tête */}
      <section className="relative overflow-hidden rounded-[2rem] bg-card shadow-carte">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] md:block">
          <div className="absolute inset-0 [clip-path:ellipse(85%_120%_at_100%_50%)]">
            <Residence />
          </div>
        </div>
        <div className="relative flex flex-col gap-5 p-7 sm:p-10 md:max-w-[58%]">
          <h1 className="text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
            Bonjour{nom ? ` ${nom}` : ''} ! <span aria-hidden="true">👋</span>
          </h1>
          <p className="text-lg text-foreground/80">Simplifie tes démarches, concentre-toi sur tes études.</p>
          <Link
            href={suite.href}
            className="inline-flex h-12 w-fit items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-lg shadow-primary/25 outline-none transition-colors hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/30"
          >
            {index <= 0 ? 'Commencer mon parcours' : 'Continuer mon parcours'}
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <Parcours indexCourant={index} liens />

      {!donnees ? (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" />
          Chargement de ton tableau de bord…
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Aides estimées */}
          <Carte>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold text-foreground">Mes aides estimées</h2>
              <LienCarte href="/aides">Voir le détail</LienCarte>
            </div>
            <div className="mt-3 flex items-end justify-between gap-4">
              {apl !== null ? (
                <div>
                  <p className="text-5xl font-extrabold tracking-tight text-primary">
                    ≈ {Math.round(apl)} € <span className="text-2xl font-bold">/ mois</span>
                  </p>
                  <p className="mt-1 text-step-blue">pour ton logement (APL)</p>
                </div>
              ) : nbEligibles > 0 ? (
                <div>
                  <p className="text-5xl font-extrabold tracking-tight text-primary">{nbEligibles}</p>
                  <p className="mt-1 text-step-blue">aide{nbEligibles > 1 ? 's' : ''} à laquelle tu as droit</p>
                </div>
              ) : (
                <p className="max-w-xs text-muted-foreground">
                  Dépose tes documents : on calcule tes aides et leur montant.
                </p>
              )}
              <Maison />
            </div>
          </Carte>

          {/* Documents */}
          {documents.length === 0 ? (
            <Carte className="flex items-center gap-5 bg-primary-soft">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <FileUp className="size-6" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold text-foreground">Dépose tes documents</h2>
                <p className="text-muted-foreground">Une seule fois : ils servent à toutes tes démarches.</p>
                <LienCarte href={lireSituation() ? '/documents' : '/situation'}>Commencer</LienCarte>
              </div>
            </Carte>
          ) : aCorriger > 0 ? (
            <Carte className="flex items-center gap-5 bg-step-orange-soft">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-step-orange text-white">
                <CircleAlert className="size-7" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold text-foreground">
                  {aCorriger} point{aCorriger > 1 ? 's' : ''} à corriger dans tes documents
                </h2>
                <LienCarte href="/documents">Voir mes documents</LienCarte>
              </div>
            </Carte>
          ) : (
            <Carte className="relative flex items-center gap-5 overflow-hidden bg-primary-soft">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-7" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-primary">Tes documents sont validés !</h2>
                <p className="text-step-blue">Aucune anomalie détectée.</p>
              </div>
              <span aria-hidden="true" className="absolute -right-10 -bottom-16 size-44 rounded-full bg-step-blue/15" />
            </Carte>
          )}

          {/* Démarches en cours */}
          <Carte>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold text-foreground">Mes démarches en cours</h2>
              <LienCarte href="/agents">Voir toutes</LienCarte>
            </div>
            {enCours.length === 0 ? (
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-muted-foreground">Aucune démarche lancée pour l&apos;instant.</p>
                <LienCarte href="/choix">Choisir mes démarches</LienCarte>
              </div>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {enCours.slice(0, 3).map((a) => (
                  <li key={a.id}>
                    <Link
                      href="/agents"
                      className="flex items-center gap-4 rounded-2xl p-2 outline-none hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/30"
                    >
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-step-blue">
                        <FileText className="size-6" aria-hidden="true" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-foreground">{a.nom}</span>
                          <StatutBadge statut={a.statut} />
                        </span>
                        <span className="truncate text-sm text-muted-foreground">{a.resultat ?? a.etape}</span>
                        <span className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-primary-soft">
                          <span className="block h-full rounded-full bg-step-blue" style={{ width: `${a.progression}%` }} />
                        </span>
                      </span>
                      <ArrowRight className="size-5 shrink-0 text-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Carte>

          {/* Activité récente */}
          <Carte className="flex flex-col gap-5 sm:flex-row">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">Mon activité récente</h2>
              {activite.length === 0 ? (
                <p className="mt-4 text-muted-foreground">Rien pour l&apos;instant.</p>
              ) : (
                <ol className="relative mt-4 flex flex-col gap-4 border-l-2 border-primary-soft pl-5">
                  {activite.slice(0, 4).map((e) => (
                    <li key={`${e.date}-${e.texte}`} className="relative grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
                      <span aria-hidden="true" className="absolute top-1.5 -left-[1.6rem] size-3 rounded-full bg-step-blue ring-4 ring-card" />
                      <span className="text-sm text-muted-foreground">{quand(e.date)}</span>
                      <span className="text-sm font-semibold text-foreground">{e.texte}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-center justify-center gap-2 rounded-3xl bg-primary-soft p-5 text-center sm:w-40">
              <Trophy className="size-10 text-step-orange" aria-hidden="true" />
              <p className="font-bold leading-snug text-foreground">
                {index >= 4 ? 'Tu es sur la bonne voie !' : `Étape ${Math.max(index, 0) + 1} sur ${ETAPES.length}`}
              </p>
            </div>
          </Carte>
        </div>
      )}
    </div>
  )
}
