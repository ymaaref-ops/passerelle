'use client'

import { useState } from 'react'
import { Check, ChevronDown, Home, Info, Pencil } from 'lucide-react'
import {
  APL_ESTIMEE,
  DEMARCHES,
  INFOS_APL_INITIALES,
  type DemarcheId,
} from '@/lib/validation'
import { BoutonEnvoi } from './bouton-envoi'
import { CaptureSimulateur } from './capture-simulateur'

interface SectionAplProps {
  envoyeeLe?: string
  onEnvoyer: (id: DemarcheId) => void
}

const demarche = DEMARCHES.apl

export function SectionApl({ envoyeeLe, onEnvoyer }: SectionAplProps) {
  const [infos, setInfos] = useState(INFOS_APL_INITIALES)
  const [enEdition, setEnEdition] = useState<string | null>(null)
  const [brouillon, setBrouillon] = useState('')

  const modifiees = infos.some((info, i) => info.valeur !== INFOS_APL_INITIALES[i].valeur)

  function modifier(id: string, valeur: string) {
    setEnEdition(id)
    setBrouillon(valeur)
  }

  function enregistrer(id: string) {
    const valeur = brouillon.trim()
    if (valeur) setInfos((liste) => liste.map((info) => (info.id === id ? { ...info, valeur } : info)))
    setEnEdition(null)
  }

  return (
    <details open className="group rounded-3xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-4 rounded-3xl p-5 outline-none focus-visible:ring-4 focus-visible:ring-ring/30 sm:p-6 [&::-webkit-details-marker]:hidden">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Home className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold leading-snug text-foreground">Aide au logement (APL)</h2>
          <p className="truncate text-sm text-muted-foreground">{demarche.site}</p>
        </div>
        {envoyeeLe && (
          <span className="hidden items-center gap-1.5 rounded-full border border-step-green-border bg-step-green-soft px-3 py-1 text-sm font-semibold text-step-green sm:inline-flex">
            <Check className="size-4" aria-hidden="true" />
            Envoyée
          </span>
        )}
        <p className="text-right text-xl font-bold text-step-green sm:text-2xl">{APL_ESTIMEE} €/mois</p>
        <ChevronDown
          className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
        <span className="sr-only">Afficher ou masquer le détail de l&apos;APL</span>
      </summary>

      <div className="flex flex-col gap-6 border-t border-border p-5 sm:p-6">
        <div>
          <h3 className="text-base font-bold text-foreground">Ce que l&apos;agent a rempli pour toi</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Vérifie chaque ligne. Si quelque chose est faux, corrige-le avant d&apos;envoyer.
          </p>

          <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {infos.map((info) => {
              const idChamp = `apl-info-${info.id}`
              const edition = enEdition === info.id
              return (
                <li key={info.id} className="rounded-2xl border border-border bg-background p-4">
                  {edition ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        enregistrer(info.id)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setEnEdition(null)
                      }}
                      className="flex flex-col gap-2"
                    >
                      <label htmlFor={idChamp} className="text-sm font-semibold text-foreground">
                        {info.libelle}
                      </label>
                      <input
                        id={idChamp}
                        value={brouillon}
                        onChange={(e) => setBrouillon(e.target.value)}
                        autoFocus
                        className="h-11 rounded-xl border border-input bg-card px-3 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/30"
                        >
                          Enregistrer
                        </button>
                        <button
                          type="button"
                          onClick={() => setEnEdition(null)}
                          className="inline-flex h-9 items-center rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground outline-none hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/30"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">{info.libelle}</p>
                        <p className="mt-0.5 text-base font-semibold text-foreground">{info.valeur}</p>
                      </div>
                      {!envoyeeLe && (
                        <button
                          type="button"
                          onClick={() => modifier(info.id, info.valeur)}
                          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-semibold text-primary outline-none transition-colors hover:bg-primary-soft focus-visible:ring-4 focus-visible:ring-ring/30"
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                          Modifier
                          <span className="sr-only"> : {info.libelle}</span>
                        </button>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          {modifiees && (
            <p
              role="status"
              className="mt-3 flex items-start gap-2 rounded-2xl border border-step-orange-border bg-step-orange-soft p-3 text-sm text-foreground"
            >
              <Info className="mt-0.5 size-4 shrink-0 text-step-orange" aria-hidden="true" />
              Tu as modifié des informations : l&apos;estimation sera recalculée sur le site officiel.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          <div className="flex flex-col justify-center gap-1 rounded-3xl border border-step-green-border bg-step-green-soft p-6">
            <p className="text-sm font-semibold text-step-green">Ton APL estimée</p>
            <p className="text-5xl font-bold tracking-tight text-step-green">{APL_ESTIMEE} €/mois</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Estimation du simulateur officiel. Le montant définitif est fixé par la CAF.
            </p>
          </div>
          <CaptureSimulateur site={demarche.site} nom="APL" />
        </div>

        <BoutonEnvoi demarche={demarche} envoyeeLe={envoyeeLe} onEnvoyer={onEnvoyer} />
      </div>
    </details>
  )
}
