'use client'

import { BoutonPrecedent } from '@/components/bouton-precedent'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { ArrowRight } from 'lucide-react'
import { envoyerReponseAgent, getStatutsAgents, statutsInitiaux, type AgentId } from '@/lib/agents'
import { STEP_COLORS } from '@/lib/step-colors'
import { cn } from '@/lib/utils'
import { BarreMarcheur } from '@/components/barre-marcheur'
import { JeuAttente } from '@/components/jeu-attente'
import { AgentCard } from './agent-card'
import { NotificationAgents } from './notification-agents'

const COULEUR = STEP_COLORS.green

// Aide cochée sur la page Choix → agent affiché ici.
const AGENT_PAR_AIDE: Record<string, AgentId> = {
  apl: 'apl',
  'prime-activite': 'prime-activite',
  'pret-lbp': 'prets',
  'pret-sg': 'prets',
  'pret-cic': 'prets',
  'pret-etat': 'prets',
  'bourse-crous': 'bourse',
  visale: 'visale',
  'mobili-jeune': 'mobili-jeune',
}

export function AgentsDashboard() {
  // On n'affiche que les agents des aides cochées par l'étudiant (paramètre ?aides=…).
  const parametre = useSearchParams().get('aides')
  const choisis = parametre
    ? new Set(parametre.split(',').map((id) => AGENT_PAR_AIDE[id]).filter(Boolean))
    : null
  const garder = (a: { id: AgentId }) => !choisis || choisis.has(a.id)

  const { data: tous = statutsInitiaux(), mutate } = useSWR('statuts-agents', getStatutsAgents, {
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
