'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CircleCheck, CircleHelp, ShieldCheck } from 'lucide-react'
import type { AideEvaluee } from '@/lib/eligibilite'
import {
  MONTANT_PAR_DEFAUT,
  SELECTION_PAR_DEFAUT,
  construireRecapitulatif,
  estUnPret,
} from '@/lib/choix'
import { enregistrerQuestionnaireCompte, sessionCourante } from '@/lib/compte'
import { enregistrerAidesChoisies } from '@/lib/agents'
import { lancerDemarches } from '@/lib/n8n'
import {
  CONTEXTE_VIDE,
  champsManquants,
  completerDefauts,
  enregistrerQuestionnaireLocal,
  lireQuestionnaire,
  reponsesAEnvoyer,
  tiroirDe,
  type Contexte,
  type Reponses,
  type Valeur,
} from '@/lib/questionnaire'
import { lireSituation, type Situation } from '@/lib/session'
import { ajusterSelonSituation } from '@/lib/situation-aides'
import { cn } from '@/lib/utils'
import { AideChoix } from './aide-choix'
import { MontantPret } from './montant-pret'
import { QuestionsAide } from './questions-aide'
import { RecapAgents } from './recap-agents'

interface ChoixFormProps {
  droit: AideEvaluee[]
  peutEtre: AideEvaluee[]
  /** Ce que les documents et le profil disent déjà : évite de reposer ces questions. */
  contexte?: Contexte
}

function TitreSection({
  id,
  titre,
  description,
  couleur,
}: {
  id: string
  titre: string
  description: string
  couleur: 'green' | 'orange'
}) {
  const Icone = couleur === 'green' ? CircleCheck : CircleHelp
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full text-white',
          couleur === 'green' ? 'bg-step-green' : 'bg-step-orange',
        )}
      >
        <Icone className="size-5" aria-hidden="true" />
      </span>
      <div>
        <h2 id={id} className="text-xl font-bold text-foreground">
          {titre}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export function ChoixForm({ droit: droitInitial, peutEtre: peutEtreInitial, contexte = CONTEXTE_VIDE }: ChoixFormProps) {
  // Ne propose que les aides qui correspondent à la situation donnée par l'étudiant.
  const [situation, setSituation] = useState<Situation | null>(null)
  // Réponses aux questions complémentaires (étape Situation + questions des aides cochées).
  const [reponses, setReponses] = useState<Reponses>({})
  const [emailDemarches, setEmailDemarches] = useState('')
  useEffect(() => {
    setSituation(lireSituation())
    const q = lireQuestionnaire()
    setReponses(q?.reponses ?? {})
    setEmailDemarches(q?.email_demarches || sessionCourante()?.email || '')
  }, [])
  const { droit, peutEtre } = useMemo(
    () =>
      ajusterSelonSituation({ droit: droitInitial, peutEtre: peutEtreInitial, nonConcerne: [] }, situation, reponses),
    [droitInitial, peutEtreInitial, situation, reponses],
  )
  const [selection, setSelection] = useState<ReadonlySet<string>>(() => new Set(SELECTION_PAR_DEFAUT))
  const [montant, setMontant] = useState(MONTANT_PAR_DEFAUT)
  const [accord, setAccord] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const router = useRouter()

  const toutes = useMemo(() => [...droit, ...peutEtre], [droit, peutEtre])
  const aides = useMemo(() => toutes.map((e) => e.aide), [toutes])
  const recap = useMemo(
    () => construireRecapitulatif(selection, aides, montant),
    [selection, aides, montant],
  )
  const unPretEstCoche = aides.some((a) => estUnPret(a) && selection.has(a.id))

  // Questions à poser : celles des aides cochées, avec les valeurs proposées d'office.
  const choisies = useMemo(() => aides.filter((a) => selection.has(a.id)).map((a) => a.id), [aides, selection])
  const effectives = useMemo(() => completerDefauts(choisies, reponses, contexte), [choisies, reponses, contexte])
  const tiroirs = choisies.flatMap((id) => tiroirDe(id) ?? [])
  const manquants = useMemo(() => champsManquants(choisies, effectives, contexte), [choisies, effectives, contexte])
  const repondre = (cle: string, v: Valeur) => setReponses((r) => ({ ...completerDefauts(choisies, r, contexte), [cle]: v }))

  const basculer = (id: string, coche: boolean) => {
    setSelection((precedente) => {
      const suivante = new Set(precedente)
      if (coche) suivante.add(id)
      else suivante.delete(id)
      return suivante
    })
  }

  const peutLancer = accord && selection.size > 0 && manquants.length === 0
  const parametres = new URLSearchParams({ aides: choisies.join(',') })
  if (unPretEstCoche) parametres.set('montant', String(montant))

  // Envoie les aides cochées à n8n (workflow 2), qui lance les agents H, puis ouvre la page de suivi.
  async function lancer() {
    setEnvoi(true)
    setErreur(null)
    try {
      // Gardé pour la prochaine visite, puis envoyé avec les aides (seulement les questions affichées).
      enregistrerQuestionnaireLocal({ email_demarches: emailDemarches, reponses: effectives })
      const questionnaire = { email_demarches: emailDemarches, reponses: reponsesAEnvoyer(choisies, effectives, contexte) }
      await enregistrerQuestionnaireCompte(questionnaire).catch(() => undefined)
      await lancerDemarches(choisies, unPretEstCoche ? montant : undefined, questionnaire)
      enregistrerAidesChoisies(choisies)
      router.push(`/agents?${parametres.toString()}`)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Les agents n'ont pas pu être lancés.")
      setEnvoi(false)
    }
  }

  const classesBouton =
    'inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-step-green px-8 text-lg font-bold text-white transition-colors outline-none focus-visible:ring-4 focus-visible:ring-step-green/40 sm:w-auto'

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="titre-droit">
        <TitreSection
          id="titre-droit"
          titre="Tu y as droit"
          description="Coche celles que tu veux demander."
          couleur="green"
        />
        <ul className="grid gap-4 md:grid-cols-2">
          {droit.map((evaluee) => (
            <AideChoix
              key={evaluee.aide.id}
              evaluee={evaluee}
              coche={selection.has(evaluee.aide.id)}
              onChange={basculer}
            />
          ))}
        </ul>
      </section>

      <MontantPret montant={montant} onChange={setMontant} actif={unPretEstCoche} />

      <section aria-labelledby="titre-peut-etre">
        <TitreSection
          id="titre-peut-etre"
          titre="Peut-être"
          description="À toi de voir si ça vaut le coup d'essayer."
          couleur="orange"
        />
        <ul className="grid gap-4 md:grid-cols-2">
          {peutEtre.map((evaluee) => (
            <AideChoix
              key={evaluee.aide.id}
              evaluee={evaluee}
              coche={selection.has(evaluee.aide.id)}
              onChange={basculer}
            />
          ))}
        </ul>
      </section>

      {tiroirs.length > 0 && (
        <section aria-labelledby="titre-questions" className="flex flex-col gap-4">
          <div>
            <h2 id="titre-questions" className="text-xl font-bold text-foreground">
              Encore quelques questions
            </h2>
            <p className="text-sm text-muted-foreground">
              Les agents en ont besoin pour remplir tes demandes. Les réponses les plus courantes sont déjà cochées.
            </p>
          </div>
          {tiroirs.map((t) => (
            <QuestionsAide
              key={t.aide}
              tiroir={t}
              reponses={effectives}
              contexte={contexte}
              afficherErreurs={accord}
              onChange={repondre}
            />
          ))}
        </section>
      )}

      <RecapAgents recap={recap} />

      <aside
        aria-labelledby="titre-garantie"
        className="flex items-start gap-4 rounded-3xl border-2 border-step-orange bg-step-orange-soft p-5 sm:p-6"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-step-orange text-white">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </span>
        <div>
          <p id="titre-garantie" className="text-lg font-bold text-foreground">
            Rien ne sera envoyé sans ton accord.
          </p>
          <p className="mt-1 leading-relaxed text-foreground">
            Si un site demande une connexion ou un CAPTCHA, c&apos;est toi qui t&apos;en charges.
          </p>
        </div>
      </aside>

      <div className="flex flex-col gap-5 rounded-3xl bg-card shadow-carte p-5 sm:p-6">
        <label
          htmlFor="accord-documents"
          className="flex cursor-pointer items-start gap-4 has-[:focus-visible]:rounded-xl has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-step-green/40"
        >
          <input
            id="accord-documents"
            type="checkbox"
            required
            checked={accord}
            onChange={(e) => setAccord(e.target.checked)}
            className="mt-0.5 size-6 shrink-0 cursor-pointer accent-step-green outline-none"
          />
          <span className="text-base leading-relaxed font-medium text-foreground">
            J&apos;accepte que Passerelle utilise mes documents pour ces démarches.
          </span>
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {peutLancer ? (
            <button
              type="button"
              onClick={lancer}
              disabled={envoi}
              aria-busy={envoi}
              className={cn(classesBouton, 'hover:bg-step-green/90 disabled:cursor-wait disabled:opacity-80')}
            >
              {envoi ? 'Lancement…' : 'Lancer les agents'}
              <ArrowRight className="size-5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              disabled
              aria-describedby="aide-bouton"
              className={cn(classesBouton, 'cursor-not-allowed bg-muted text-muted-foreground')}
            >
              Lancer les agents
              <ArrowRight className="size-5" aria-hidden="true" />
            </button>
          )}
          {erreur && (
            <p role="alert" className="text-sm font-medium text-danger">
              {erreur}
            </p>
          )}
          {!peutLancer && (
            <p id="aide-bouton" className="text-sm text-muted-foreground">
              {selection.size === 0
                ? 'Coche au moins une démarche pour continuer.'
                : manquants.length > 0
                  ? `Il reste ${manquants.length} question${manquants.length > 1 ? 's' : ''} à remplir (${[
                      ...new Set(manquants.map((m) => tiroirDe(m.aide)?.titre)),
                    ].join(', ')}).`
                  : 'Coche la case ci-dessus pour pouvoir continuer.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
