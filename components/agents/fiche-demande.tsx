'use client'

import { useState } from 'react'
import { Check, Copy, ExternalLink, FileText, ListChecks, TriangleAlert } from 'lucide-react'

/** Fiche rendue par les agents Visale / Mobili-Jeune : ce que l'étudiant recopie lui-même sur le site. */
interface Fiche {
  statut?: string
  action_requise_etudiant?: string
  lien_a_ouvrir?: string | null
  etapes_etudiant?: string[]
  reponses_formulaire?: { rubrique: string; champ: string; valeur: string }[]
  pieces_a_preparer?: string[]
  points_a_verifier?: string[]
  montant_aide_mensuelle_euros?: number | null
  plafond_loyer_garanti_euros?: number | null
}

export function lireFiche(message: string | null): Fiche | null {
  if (!message) return null
  try {
    const bloc = message.match(/\{[\s\S]*\}/)
    const o = JSON.parse(bloc ? bloc[0] : message)
    return o && typeof o === 'object' ? (o as Fiche) : null
  } catch {
    return null
  }
}

function Copier({ texte }: { texte: string }) {
  const [copie, setCopie] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(texte).then(() => {
          setCopie(true)
          window.setTimeout(() => setCopie(false), 1500)
        })
      }}
      aria-label={`Copier : ${texte}`}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {copie ? <Check className="size-4 text-success" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
    </button>
  )
}

export function FicheDemande({ fiche, site }: { fiche: Fiche; site: string }) {
  const lien = fiche.lien_a_ouvrir && /^https:\/\//.test(fiche.lien_a_ouvrir) ? fiche.lien_a_ouvrir : null
  const rubriques = new Map<string, { champ: string; valeur: string }[]>()
  for (const r of fiche.reponses_formulaire ?? []) {
    const liste = rubriques.get(r.rubrique) ?? []
    liste.push({ champ: r.champ, valeur: r.valeur })
    rubriques.set(r.rubrique, liste)
  }
  const montant = fiche.montant_aide_mensuelle_euros ?? null
  const plafond = fiche.plafond_loyer_garanti_euros ?? null

  if (fiche.statut === 'non_eligible') {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-step-orange-border bg-step-orange-soft p-4">
        <p className="flex items-center gap-2 font-semibold text-foreground">
          <TriangleAlert className="size-5 text-step-orange" aria-hidden="true" />
          D&apos;après ton dossier, tu ne sembles pas éligible
        </p>
        {fiche.action_requise_etudiant && <p className="text-foreground">{fiche.action_requise_etudiant}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-step-green-border bg-step-green-soft/40 p-4">
      <div className="flex flex-col gap-2">
        <p className="font-semibold text-foreground">Ta fiche est prête</p>
        {fiche.action_requise_etudiant && <p className="leading-relaxed text-foreground">{fiche.action_requise_etudiant}</p>}
        {(montant !== null || plafond !== null) && (
          <p className="text-sm text-muted-foreground">
            {montant !== null && `Aide estimée : ${montant} € par mois. `}
            {plafond !== null && `Loyer garanti jusqu'à ${plafond} € par mois.`}
          </p>
        )}
        {lien && (
          <a
            href={lien}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 self-start rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Créer mon compte sur {site}
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        )}
      </div>

      {(fiche.etapes_etudiant?.length ?? 0) > 0 && (
        <section>
          <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <ListChecks className="size-4" aria-hidden="true" />
            Les étapes, dans l&apos;ordre
          </h4>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-foreground">
            {fiche.etapes_etudiant!.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ol>
        </section>
      )}

      {rubriques.size > 0 && (
        <section>
          <h4 className="text-sm font-bold text-foreground">Ce que tu recopies dans le formulaire</h4>
          <div className="mt-2 flex flex-col gap-3">
            {[...rubriques.entries()].map(([rubrique, champs]) => (
              <div key={rubrique} className="rounded-xl border border-border bg-card">
                <p className="border-b border-border px-3 py-2 text-sm font-semibold text-foreground">{rubrique}</p>
                <dl>
                  {champs.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0">
                      <dt className="w-2/5 shrink-0 text-sm text-muted-foreground">{c.champ}</dt>
                      <dd className="min-w-0 flex-1 text-sm font-medium break-words text-foreground">{c.valeur}</dd>
                      {c.valeur && !/à compléter/i.test(c.valeur) && <Copier texte={c.valeur} />}
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </section>
      )}

      {(fiche.pieces_a_preparer?.length ?? 0) > 0 && (
        <section>
          <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <FileText className="size-4" aria-hidden="true" />
            Les pièces à avoir sous la main
          </h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
            {fiche.pieces_a_preparer!.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </section>
      )}

      {(fiche.points_a_verifier?.length ?? 0) > 0 && (
        <section className="rounded-xl border border-step-orange-border bg-step-orange-soft p-3">
          <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <TriangleAlert className="size-4 text-step-orange" aria-hidden="true" />
            À vérifier ou compléter
          </h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
            {fiche.points_a_verifier!.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
