'use client'

import { useState } from 'react'
import { Landmark } from 'lucide-react'
import { formaterEuros } from '@/lib/eligibilite'
import { MONTANT_MAX, MONTANT_MIN, MONTANT_PAS, borner } from '@/lib/choix'
import { cn } from '@/lib/utils'

interface MontantPretProps {
  montant: number
  onChange: (montant: number) => void
  actif: boolean
}

export function MontantPret({ montant, onChange, actif }: MontantPretProps) {
  // Texte en cours de saisie : permet de taper librement avant de borner à la sortie du champ.
  const [saisie, setSaisie] = useState<string | null>(null)

  const valider = () => {
    if (saisie === null) return
    const nombre = Number(saisie.replace(/\s/g, ''))
    if (Number.isFinite(nombre) && saisie.trim() !== '') onChange(borner(nombre))
    setSaisie(null)
  }

  return (
    <section
      aria-labelledby="titre-montant"
      className={cn(
        'rounded-3xl border border-step-green-border bg-card p-5 transition-opacity sm:p-6',
        !actif && 'opacity-60',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-step-green text-white">
          <Landmark className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h3 id="titre-montant" className="text-lg font-bold text-foreground">
            Montant souhaité pour ton prêt
          </h3>
          <p className="text-sm text-muted-foreground">
            {actif
              ? 'Les banques comparées partiront de ce montant.'
              : 'Coche un prêt étudiant pour choisir un montant.'}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
        <div className="relative w-full sm:w-52">
          <label htmlFor="montant-souhaite" className="sr-only">
            Montant souhaité en euros
          </label>
          <input
            id="montant-souhaite"
            type="text"
            inputMode="numeric"
            disabled={!actif}
            value={saisie ?? formaterEuros(montant).replace(' €', '')}
            onChange={(e) => setSaisie(e.target.value)}
            onBlur={valider}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                valider()
              }
            }}
            className="h-14 w-full rounded-2xl border border-input bg-background pr-10 pl-4 text-2xl font-extrabold text-foreground tabular-nums outline-none focus-visible:border-step-green focus-visible:ring-3 focus-visible:ring-step-green/30 disabled:cursor-not-allowed"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xl font-bold text-muted-foreground"
          >
            €
          </span>
        </div>

        <div className="flex-1">
          <input
            type="range"
            aria-label="Curseur du montant souhaité"
            min={MONTANT_MIN}
            max={MONTANT_MAX}
            step={MONTANT_PAS}
            value={montant}
            disabled={!actif}
            onChange={(e) => {
              setSaisie(null)
              onChange(Number(e.target.value))
            }}
            className="h-8 w-full cursor-pointer accent-step-green disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-sm font-medium text-muted-foreground">
            <span>{formaterEuros(MONTANT_MIN)}</span>
            <span>{formaterEuros(MONTANT_MAX)}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
