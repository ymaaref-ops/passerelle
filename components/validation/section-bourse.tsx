'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, GraduationCap, Loader2 } from 'lucide-react'
import { lireEtat } from '@/lib/n8n'

interface ResultatBourse {
  statut: string
  echelon: string | null
  annuel: number | null
  mensuel: number | null
  remarques: string | null
  blocage: string | null
}

const EN_COURS = ['en_cours', 'proposee']

function nombre(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Résultat de l'agent simulateur-bourse (bourse sur critères sociaux du Crous). */
export function SectionBourse() {
  const [r, setR] = useState<ResultatBourse | null | undefined>(undefined)

  useEffect(() => {
    let actif = true
    let minuteur: number | null = null
    async function lire() {
      try {
        const etat = await lireEtat()
        const d = etat.demarches?.find((x) => x.aide_code === 'bourse_crous')
        if (!actif) return
        if (!d) return setR(null)
        const rep = ((d.resultat_agent?.reponse ?? {}) as Record<string, unknown>) || {}
        setR({
          statut: d.statut,
          echelon: rep.echelon != null && rep.echelon !== '' ? String(rep.echelon) : null,
          annuel: nombre(rep.montant_annuel),
          mensuel: nombre(d.montant_estime ?? rep.montant_mensuel),
          remarques: typeof rep.remarques === 'string' ? rep.remarques : null,
          blocage: d.resultat_agent?.etape_bloquante ?? null,
        })
        if (EN_COURS.includes(d.statut)) minuteur = window.setTimeout(lire, 15000)
      } catch {
        if (actif) minuteur = window.setTimeout(lire, 15000)
      }
    }
    void lire()
    return () => {
      actif = false
      if (minuteur) window.clearTimeout(minuteur)
    }
  }, [])

  if (r === null) return null
  const enCours = r ? EN_COURS.includes(r.statut) : true
  const nonEligible = r?.echelon ? /non|aucun/i.test(r.echelon) : r?.mensuel === 0
  const reussi = r && !enCours && (r.echelon || r.mensuel !== null)

  return (
    <section className="rounded-3xl bg-card shadow-carte p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <GraduationCap className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold leading-snug text-foreground">Bourse du Crous</h2>
          <p className="text-sm text-muted-foreground">Simulation sur critères sociaux</p>
        </div>
        {reussi && !nonEligible && (
          <p className="text-right text-xl font-bold text-step-green sm:text-2xl">
            {r!.echelon ? `Échelon ${r!.echelon}` : ''}
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {(r === undefined || enCours) && (
          <p className="flex items-center gap-2 text-foreground">
            <Loader2 className="size-5 text-primary motion-safe:animate-spin" aria-hidden="true" />
            L&apos;agent simule ta bourse…
          </p>
        )}
        {reussi && (
          <div className="rounded-3xl border border-step-green-border bg-step-green-soft p-5">
            {nonEligible ? (
              <p className="font-semibold text-foreground">D&apos;après le simulateur, tu n&apos;as pas droit à la bourse cette année.</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-step-green">Ta bourse estimée</p>
                <p className="text-4xl font-bold tracking-tight text-step-green">
                  {r!.annuel !== null ? `${r!.annuel.toLocaleString('fr-FR')} €/an` : r!.mensuel !== null ? `${r!.mensuel} €/mois` : '—'}
                </p>
                {r!.annuel !== null && (
                  <p className="text-sm text-muted-foreground">Soit environ {Math.round(r!.annuel / 10)} € par mois, sur 10 mois.</p>
                )}
              </>
            )}
            {r!.remarques && <p className="mt-2 text-sm text-muted-foreground">{r!.remarques}</p>}
          </div>
        )}
        {r && !enCours && !reussi && (
          <p className="text-foreground">{r.blocage ?? "La simulation ne s'est pas terminée."}</p>
        )}
        {r && !enCours && !nonEligible && (
          <a
            href="https://messervices.etudiant.gouv.fr/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 self-start rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Faire ma demande (dossier social étudiant)
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        )}
      </div>
    </section>
  )
}
