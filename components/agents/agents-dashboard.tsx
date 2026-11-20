'use client'

import { BoutonPrecedent } from '@/components/bouton-precedent'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AGENT_PAR_AIDE, envoyerReponseAgent, getStatutsAgents, lireAidesChoisies, statutsInitiaux, type AgentId } from '@/lib/agents'
import { AlerteSites } from '@/components/alerte-sites'
import { SITES_PAR_AGENT } from '@/lib/etat-sites'
import { STEP_COLORS } from '@/lib/step-colors'
import { cn } from '@/lib/utils'
import { BarreMarcheur } from '@/components/barre-marcheur'
import { JeuAttente } from '@/components/jeu-attente'
import { AgentCard } from './agent-card'
import { NotificationAgents } from './notification-agents'

const COULEUR = STEP_COLORS.green


export function AgentsDashboard() {
  // On n'affiche que les agents des aides cochées par l'étudiant : celles de l'adresse (?aides=…),
  // sinon celles gardées au lancement, sinon les démarches cochées enregistrées par n8n.
  const parametre = useSearchParams().get('aides')
  const [memoire, setMemoire] = useState<string | null>(null)
  useEffect(() => setMemoire(lireAidesChoisies()), [])
  const liste = parametre || memoire
  const choisis = liste ? new Set(liste.split(',').map((id) => AGENT_PAR_AIDE[id]).filter(Boolean)) : null
  const garder = (a: { id: AgentId; choisie?: boolean }) => (choisis ? choisis.has(a.id) : Boolean(a.choisie))

  // Vrai après la première lecture de n8n (évite d'afficher « aucune démarche » avant d'avoir lu).
  const [charge, setCharge] = useState(false)
  const lire = async () => {
    const r = await getStatutsAgents()
    setCharge(true)
    return r
  }
  const { data: tous = statutsInitiaux(), mutate } = useSWR('statuts-agents', lire, {
    fallbackData: statutsInitiaux(),
    // Toutes les 3 s : l'APL est lue sur n8n, inutile de l'interroger plus souvent.
    refreshInterval: (dernier) => (dernier?.filter(garder).filter((a) => !a.bientot).every((a) => a.statut === 'termine') ? 0 : 3000),
  })
  const agents = tous.filter(garder)
  // Les agents pas encore activés ne comptent pas dans l'avancement.
  const actifs = agents.filter((a) => !a.bientot)

  const total = actifs.length
  const termines = actifs.filter((a) => a.statut === 'termine').length
  const toutTermine = total > 0 && termines === total
  const seulementBientot = total === 0 && agents.length > 0
  const progressionGlobale = total ? Math.round(actifs.reduce((somme, a) => somme + a.progression, 0) / total) : 0

  async function envoyer(agentId: AgentId, reponse: string) {
    await envoyerReponseAgent(agentId, reponse)
    await mutate()
  }

  if (agents.length === 0 && charge) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
        <header className="en-tete-page flex flex-col gap-4">
          <p className={cn('inline-flex w-fit rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold', COULEUR.text)}>
            Étape 5 sur 6
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">Aucune démarche lancée</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Choisis d&apos;abord les aides que tu veux demander : leurs agents apparaîtront ici.
          </p>
          <Link
            href="/choix"
            className="inline-flex h-12 w-fit items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Choisir mes démarches
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        </header>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
      <BoutonPrecedent href="/choix" label="Précédent : ton choix" />
      <NotificationAgents agents={agents} />

      <header className="en-tete-page flex flex-col gap-6">
        <div className="max-w-2xl">
          <p className={cn('inline-flex rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold', COULEUR.text)}>Étape 5 sur 6</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
            {seulementBientot
              ? 'Tes demandes seront bientôt préparées'
              : toutTermine
              ? total === 1
                ? 'Ton agent a terminé'
                : `Tes ${total} agents ont terminé`
              : total === 1
                ? 'Ton agent travaille pour toi'
                : `${total} agents travaillent en parallèle pour toi`}
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
            {seulementBientot
              ? 'Ces agents arrivent bientôt sur Passerelle. En attendant, on te guide pas à pas.'
              : toutTermine
              ? "Tout est prêt. Tu vas pouvoir vérifier chaque résultat avant l'envoi."
              : 'Reste sur cette page : un agent peut avoir besoin de toi à tout moment.'}
          </p>
        </div>

        <div className="pleine-largeur flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xl font-bold text-foreground">
              <span className={COULEUR.text}>{termines}</span> sur {total} terminés
            </p>
            <p className="text-sm text-muted-foreground tabular-nums">{progressionGlobale} %</p>
          </div>
          <BarreMarcheur
            valeur={progressionGlobale}
            label={`Progression globale : ${termines} sur ${total} agents terminés`}
            couleur={COULEUR.solid}
          />
        </div>
      </header>

      <AlerteSites
        seulement={[...new Set(agents.flatMap((a) => SITES_PAR_AGENT[a.id] ?? []))]}
        consequence="Les agents de ces sites risquent de s'arrêter. Relance-les depuis « Mes démarches » quand le site sera revenu."
      />

      {!toutTermine && !seulementBientot && total > 0 && <JeuAttente />}

      <section aria-label="Détail des agents" className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onEnvoyer={(reponse) => envoyer(agent.id, reponse)}
          />
        ))}
      </section>

      <footer className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {toutTermine ? (
          <Link
            href="/validation"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-step-green px-8 text-lg font-semibold text-white outline-none transition-colors hover:bg-step-green/90 focus-visible:ring-4 focus-visible:ring-step-green/30"
          >
            Voir les résultats
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        ) : (
          <p className="text-base text-muted-foreground">
            Le bouton « Voir les résultats » apparaîtra quand {total === 1 ? 'ton agent aura' : `les ${total} agents auront`} terminé.
          </p>
        )}
      </footer>
    </div>
  )
}
