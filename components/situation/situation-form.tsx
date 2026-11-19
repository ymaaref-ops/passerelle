'use client'

import { useEffect, useState } from 'react'
import { enregistrerSituationCompte } from '@/lib/compte'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  enregistrerSituation,
  lireSituation,
  type Activite,
  type Bourse,
  type Logement,
} from '@/lib/session'
import { cn } from '@/lib/utils'

interface Option<T extends string> {
  valeur: T
  label: string
}

const LOGEMENT: Option<Logement>[] = [
  { valeur: 'locataire', label: 'Je suis locataire' },
  { valeur: 'parents', label: 'Je vis chez mes parents' },
  { valeur: 'cherche', label: 'Je cherche un logement' },
]

const ACTIVITE: Option<Activite>[] = [
  { valeur: 'alternance', label: 'Alternance' },
  { valeur: 'job', label: 'Job étudiant' },
  { valeur: 'aucune', label: "Pas d'activité" },
]

const BOURSE: Option<Bourse>[] = [
  { valeur: 'oui', label: 'Oui' },
  { valeur: 'non', label: 'Non' },
  { valeur: 'ne_sais_pas', label: 'Je ne sais pas' },
]

function Question<T extends string>({
  nom,
  titre,
  aide,
  options,
  valeur,
  onChange,
}: {
  nom: string
  titre: string
  aide?: string
  options: Option<T>[]
  valeur: T | ''
  onChange: (v: T) => void
}) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 sm:p-6">
      <legend className="sr-only">{titre}</legend>
      <div>
        <p className="text-lg font-bold text-foreground" aria-hidden="true">
          {titre}
        </p>
        {aide && <p className="text-sm text-muted-foreground">{aide}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.valeur}
            className={cn(
              'flex h-12 cursor-pointer items-center rounded-full border-2 px-5 font-semibold transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring/30',
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
    </fieldset>
  )
}

export function SituationForm() {
  const router = useRouter()
  const [logement, setLogement] = useState<Logement | ''>('')
  const [activite, setActivite] = useState<Activite | ''>('')
  const [bourse, setBourse] = useState<Bourse | ''>('')
  const [ressources, setRessources] = useState('')

  // Reprend les réponses déjà données (retour en arrière).
  useEffect(() => {
    const s = lireSituation()
    if (!s) return
    setLogement(s.logement)
    setActivite(s.activite)
    setBourse(s.bourse)
    setRessources(String(s.ressources))
  }, [])

  // Sans activité, pas de revenus à saisir.
  const revenusDemandes = activite !== '' && activite !== 'aucune'
  const ressourcesOk = !revenusDemandes || (ressources.trim() !== '' && Number(ressources) >= 0)
  const complet = logement !== '' && activite !== '' && bourse !== '' && ressourcesOk

  function continuer() {
    if (!complet) return
    const situation = {
      logement: logement as Logement,
      activite: activite as Activite,
      bourse: bourse as Bourse,
      ressources: revenusDemandes ? Number(ressources) : 0,
    }
    enregistrerSituation(situation)
    // Gardée dans le compte : pré-remplie à la prochaine visite.
    void enregistrerSituationCompte(situation).catch(() => undefined)
    router.push('/documents')
  }

  return (
    <div className="flex flex-col gap-5">
      <Question nom="logement" titre="Ton logement" options={LOGEMENT} valeur={logement} onChange={setLogement} />
      <Question nom="activite" titre="Ton activité" options={ACTIVITE} valeur={activite} onChange={setActivite} />

      {revenusDemandes && (
        <label className="flex flex-col gap-1.5 rounded-3xl border border-border bg-card p-5 sm:p-6">
          <span className="text-lg font-bold text-foreground">Tes revenus des 12 derniers mois (en €)</span>
          <span className="text-sm text-muted-foreground">
            Le <strong>total sur l&apos;année</strong> de tes salaires nets, pas le montant d&apos;un mois. Par exemple,
            1 100 € par mois pendant 12 mois = 13 200 €. La CAF s&apos;en sert pour l&apos;APL et la prime
            d&apos;activité : le montant change beaucoup le résultat.
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={ressources}
            onChange={(e) => setRessources(e.target.value)}
            className="mt-2 h-12 max-w-xs rounded-xl border border-border bg-background px-4 text-base outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
          />
          {Number(ressources) > 0 && (
            <span className="text-sm text-muted-foreground">
              Soit environ {Math.round(Number(ressources) / 12).toLocaleString('fr-FR')} € par mois.
            </span>
          )}
        </label>
      )}

      <Question
        nom="bourse"
        titre="Es-tu boursier ou boursière cette année ?"
        aide="Bourse sur critères sociaux du Crous."
        options={BOURSE}
        valeur={bourse}
        onChange={setBourse}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={continuer}
          disabled={!complet}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'h-14 gap-2 rounded-2xl px-7 text-base font-semibold disabled:cursor-not-allowed',
          )}
        >
          Continuer
          <ArrowRight className="size-5" aria-hidden="true" />
        </button>
        {!complet && <p className="text-sm text-muted-foreground">Réponds aux questions pour continuer.</p>}
      </div>
    </div>
  )
}
