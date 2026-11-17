'use client'

import { Award, ChevronDown, Landmark } from 'lucide-react'
import {
  DEMARCHES,
  MEILLEURE_OFFRE,
  MONTANT_PRET,
  OFFRES_PRET,
  formaterEurosCentimes,
  formaterTaux,
  type DemarcheId,
  type EnvoisParDemarche,
  type OffrePret,
} from '@/lib/validation'
import { formaterEuros } from '@/lib/eligibilite'
import { cn } from '@/lib/utils'
import { BoutonEnvoi } from './bouton-envoi'
import { CaptureSimulateur } from './capture-simulateur'

interface SectionPretProps {
  envois: EnvoisParDemarche
  onEnvoyer: (id: DemarcheId) => void
}

function BadgeMeilleureOffre() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-step-green px-3 py-1 text-sm font-semibold text-white">
      <Award className="size-4" aria-hidden="true" />
      Meilleure offre
    </span>
  )
}

function estMeilleure(offre: OffrePret): boolean {
  return offre.id === MEILLEURE_OFFRE.id
}

function CoutTotal({ offre }: { offre: OffrePret }) {
  return (
    <>
      <span className="block text-base font-bold text-foreground">{formaterEurosCentimes(offre.coutTotal)}</span>
      <span className="block text-xs text-muted-foreground">
        dont {formaterEurosCentimes(offre.interets)} d&apos;intérêts
      </span>
    </>
  )
}

export function SectionPret({ envois, onEnvoyer }: SectionPretProps) {
  const toutesEnvoyees = OFFRES_PRET.every((o) => envois[o.id])

  return (
    <details open className="group rounded-3xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-4 rounded-3xl p-5 outline-none focus-visible:ring-4 focus-visible:ring-ring/30 sm:p-6 [&::-webkit-details-marker]:hidden">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Landmark className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold leading-snug text-foreground">Prêt étudiant</h2>
          <p className="text-sm text-muted-foreground">
            Comparatif de 3 banques pour {formaterEuros(MONTANT_PRET)}
          </p>
        </div>
        {toutesEnvoyees && (
          <span className="hidden rounded-full border border-step-green-border bg-step-green-soft px-3 py-1 text-sm font-semibold text-step-green sm:inline">
            Tout envoyé
          </span>
        )}
        <ChevronDown
          className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
        <span className="sr-only">Afficher ou masquer le comparatif des prêts</span>
      </summary>

      <div className="flex flex-col gap-6 border-t border-border p-5 sm:p-6">
        <p className="text-base text-muted-foreground">
          Les trois offres sont calculées sur la même durée pour être comparables. La meilleure est celle qui te
          coûte le moins au total.
        </p>

        {/* Bureau : tableau comparatif */}
        <div className="hidden overflow-hidden rounded-2xl border border-border lg:block">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">
              Comparatif des offres de prêt étudiant pour {formaterEuros(MONTANT_PRET)}
            </caption>
            <thead className="bg-muted text-sm text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Banque</th>
                <th scope="col" className="px-4 py-3 font-semibold">Taux</th>
                <th scope="col" className="px-4 py-3 font-semibold">Durée</th>
                <th scope="col" className="px-4 py-3 font-semibold">Mensualité</th>
                <th scope="col" className="px-4 py-3 font-semibold">Coût total</th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  <span className="sr-only">Démarche</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {OFFRES_PRET.map((offre) => (
                <tr
                  key={offre.id}
                  className={cn(
                    'border-t border-border align-top',
                    estMeilleure(offre) && 'bg-step-green-soft',
                  )}
                >
                  <th scope="row" className="px-4 py-4 text-base font-bold text-foreground">
                    <span className="block">{offre.banque}</span>
                    {estMeilleure(offre) && (
                      <span className="mt-2 block">
                        <BadgeMeilleureOffre />
                      </span>
                    )}
                  </th>
                  <td className="px-4 py-4 text-base font-semibold whitespace-nowrap text-foreground">{formaterTaux(offre.taux)}</td>
                  <td className="px-4 py-4 text-base whitespace-nowrap text-foreground">{offre.duree} mois</td>
                  <td className="px-4 py-4 text-base font-semibold text-foreground">
                    {formaterEurosCentimes(offre.mensualite)}
                  </td>
                  <td className="px-4 py-4">
                    <CoutTotal offre={offre} />
                  </td>
                  <td className="px-4 py-4">
                    <BoutonEnvoi
                      demarche={DEMARCHES[offre.id]}
                      envoyeeLe={envois[offre.id]}
                      onEnvoyer={onEnvoyer}
                      className="[&>button]:h-11 [&>button]:px-4 [&>button]:text-sm [&>button]:whitespace-nowrap"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile : une carte par banque */}
        <ul className="flex flex-col gap-4 lg:hidden">
          {OFFRES_PRET.map((offre) => (
            <li
              key={offre.id}
              className={cn(
                'flex flex-col gap-4 rounded-2xl border p-4',
                estMeilleure(offre) ? 'border-step-green-border bg-step-green-soft' : 'border-border bg-background',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-foreground">{offre.banque}</h3>
                {estMeilleure(offre) && <BadgeMeilleureOffre />}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <dt className="text-sm text-muted-foreground">Taux</dt>
                  <dd className="text-base font-semibold text-foreground">{formaterTaux(offre.taux)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Durée</dt>
                  <dd className="text-base font-semibold text-foreground">{offre.duree} mois</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Mensualité</dt>
                  <dd className="text-base font-semibold text-foreground">
                    {formaterEurosCentimes(offre.mensualite)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Coût total</dt>
                  <dd>
                    <CoutTotal offre={offre} />
                  </dd>
                </div>
              </dl>
              <BoutonEnvoi demarche={DEMARCHES[offre.id]} envoyeeLe={envois[offre.id]} onEnvoyer={onEnvoyer} />
            </li>
          ))}
        </ul>

        <div>
          <h3 className="text-base font-bold text-foreground">Captures des simulateurs</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            {OFFRES_PRET.map((offre) => (
              <CaptureSimulateur
                key={offre.id}
                site={DEMARCHES[offre.id].site}
                nom={`de prêt ${offre.banque}`}
              />
            ))}
          </div>
        </div>
      </div>
    </details>
  )
}
