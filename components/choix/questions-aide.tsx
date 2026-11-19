'use client'

import { ClipboardList, FileCheck } from 'lucide-react'
import {
  champVisible,
  erreurChamp,
  valeurOcr,
  type Champ,
  type Contexte,
  type Reponses,
  type Tiroir,
  type Valeur,
} from '@/lib/questionnaire'
import { cn } from '@/lib/utils'

function Pastilles({
  nom,
  options,
  valeur,
  onChange,
}: {
  nom: string
  options: { valeur: string; label: string }[]
  valeur: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label
          key={o.valeur}
          className={cn(
            'flex min-h-11 cursor-pointer items-center rounded-full border-2 px-4 text-sm font-semibold transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring/30',
            valeur === o.valeur
              ? 'border-step-blue bg-step-blue text-white'
              : 'border-border bg-background text-foreground hover:border-step-blue-border',
          )}
        >
          <input
            type="radio"
            name={nom}
            value={o.valeur}
            checked={valeur === o.valeur}
            onChange={() => onChange(o.valeur)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  )
}

function ChampQuestion({
  champ,
  valeur,
  lue,
  afficherErreur,
  onChange,
}: {
  champ: Champ
  valeur: Valeur | undefined
  /** Valeur trouvée sur les documents (null si rien). */
  lue: Valeur
  afficherErreur: boolean
  onChange: (v: Valeur) => void
}) {
  // Les erreurs de format s'affichent tout de suite ; les champs vides, seulement quand on le demande.
  const rempli = valeur !== null && valeur !== undefined && valeur !== ''
  const erreur = afficherErreur || rempli ? erreurChamp(champ, valeur) : null
  const id = `q-${champ.cle}`
  const titre = (
    <>
      <span className="font-semibold text-foreground">
        {champ.label}
        {!champ.obligatoire && champ.type !== 'oui_non' && (
          <span className="font-normal text-muted-foreground"> (facultatif)</span>
        )}
      </span>
      {champ.aide && <span className="text-sm text-muted-foreground">{champ.aide}</span>}
      {lue !== null && (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-step-green-soft px-2.5 py-0.5 text-xs font-semibold text-step-green">
          <FileCheck className="size-3.5" aria-hidden="true" />
          {valeur === lue
            ? 'Rempli à partir de tes documents : vérifie et corrige si besoin'
            : `Sur tes documents : ${
                lue === true
                  ? 'oui'
                  : lue === false
                    ? 'non'
                    : (champ.options?.find((o) => o.valeur === lue)?.label ?? String(lue))
              }`}
        </span>
      )}
    </>
  )

  if (champ.type === 'oui_non' || champ.type === 'choix') {
    const options =
      champ.type === 'oui_non'
        ? [
            { valeur: 'oui', label: 'Oui' },
            { valeur: 'non', label: 'Non' },
          ]
        : (champ.options ?? [])
    const courante = champ.type === 'oui_non' ? (valeur === true ? 'oui' : valeur === false ? 'non' : '') : String(valeur ?? '')
    return (
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 flex flex-col gap-0.5">{titre}</legend>
        <Pastilles
          nom={id}
          options={options}
          valeur={courante}
          onChange={(v) => onChange(champ.type === 'oui_non' ? v === 'oui' : v)}
        />
        {erreur && <span className="text-sm font-medium text-danger">{erreur}</span>}
      </fieldset>
    )
  }

  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      {titre}
      <input
        id={id}
        type={champ.type === 'nombre' ? 'number' : champ.type === 'date' ? 'date' : 'text'}
        inputMode={champ.type === 'nombre' ? 'decimal' : undefined}
        min={champ.type === 'nombre' ? 0 : undefined}
        value={valeur === null || valeur === undefined ? '' : String(valeur)}
        onChange={(e) => {
          const brut = e.target.value
          if (champ.type === 'nombre') onChange(brut === '' ? null : Number(brut.replace(',', '.')))
          else onChange(brut)
        }}
        aria-invalid={erreur ? true : undefined}
        className={cn(
          'mt-1 h-12 rounded-xl border bg-background px-4 text-base outline-none focus-visible:ring-4 focus-visible:ring-ring/30',
          champ.type === 'texte' ? 'max-w-md' : 'max-w-xs',
          erreur ? 'border-danger' : 'border-border',
        )}
      />
      {erreur && <span className="text-sm font-medium text-danger">{erreur}</span>}
    </label>
  )
}

/** Questions complémentaires d'une aide cochée (spécification d'Ema), avec les valeurs proposées d'office. */
export function QuestionsAide({
  tiroir,
  reponses,
  contexte,
  afficherErreurs,
  onChange,
}: {
  tiroir: Tiroir
  reponses: Reponses
  contexte: Contexte
  afficherErreurs: boolean
  onChange: (cle: string, v: Valeur) => void
}) {
  const champs = tiroir.champs.filter((c) => champVisible(c, reponses, contexte))
  return (
    <details open className="group rounded-3xl bg-card shadow-carte p-5 sm:p-6">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-ring/30">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-step-blue text-white">
          <ClipboardList className="size-5" aria-hidden="true" />
        </span>
        <span className="flex flex-col">
          <span className="text-lg font-bold text-foreground">{tiroir.titre} : quelques questions</span>
          <span className="text-sm text-muted-foreground">{tiroir.intro}</span>
        </span>
      </summary>
      <div className="mt-5 flex flex-col gap-5">
        {champs.map((c) => (
          <ChampQuestion
            key={c.cle}
            champ={c}
            valeur={reponses[c.cle]}
            lue={valeurOcr(c, contexte)}
            afficherErreur={afficherErreurs}
            onChange={(v) => onChange(c.cle, v)}
          />
        ))}
      </div>
    </details>
  )
}
