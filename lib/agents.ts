import { calculerStatuts, obtenirEtatSimule } from '@/lib/agents-simulation'

export type AgentId = 'apl' | 'banque-postale' | 'societe-generale' | 'cic'

export type StatutAgent = 'attente' | 'en_cours' | 'besoin' | 'termine'

export type TypeDemande = 'code' | 'info'

export interface DemandeAgent {
  type: TypeDemande
  question: string
  /** Type de champ pour une demande d'information. */
  champ?: 'texte' | 'date'
}

export interface AgentStatut {
  id: AgentId
  nom: string
  site: string
  statut: StatutAgent
  /** Étape en cours, décrite en une phrase. */
  etape: string
  /** Progression de 0 à 100. */
  progression: number
  /** Présent uniquement quand statut === 'besoin'. */
  demande?: DemandeAgent
  /** Vrai juste après l'envoi d'une réponse, le temps que l'agent reprenne. */
  reprise?: boolean
  /** Présent uniquement quand statut === 'termine'. */
  resultat?: string
}

/**
 * Récupère les statuts des agents.
 * Données simulées pour l'instant : à brancher sur Supabase et les agents H.
 */
export async function getStatutsAgents(): Promise<AgentStatut[]> {
  return calculerStatuts(obtenirEtatSimule(), Date.now())
}

/**
 * Envoie la réponse de l'étudiant à un agent qui l'attend (code de vérification
 * ou information manquante).
 * Données simulées pour l'instant : à brancher sur Supabase et les agents H.
 */
export async function envoyerReponseAgent(agentId: AgentId, reponse: string): Promise<void> {
  const valeur = reponse.trim()
  if (!valeur) throw new Error('La réponse est vide.')

  const etat = obtenirEtatSimule()
  const agent = calculerStatuts(etat, Date.now()).find((a) => a.id === agentId)
  if (!agent || agent.statut !== 'besoin') {
    throw new Error("Cet agent n'attend pas de réponse pour le moment.")
  }

  await new Promise((resolve) => setTimeout(resolve, 300))
  etat.reponses[agentId] = { at: Date.now(), valeur }
}
