import { calculerStatuts, obtenirEtatSimule } from '@/lib/agents-simulation'
import { lireEtat, type DemarcheN8n } from '@/lib/n8n'

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
  /** Vrai pour les agents encore simulés (pas d'agent H réel derrière). */
  demo?: boolean
  /** Lien vers la session de l'agent sur H, quand il existe. */
  lienDirect?: string
}

const AGENT_APL = { id: 'apl' as const, nom: 'Simulation APL', site: 'caf.fr' }

/** Durée typique d'une simulation APL sur H, pour estimer l'avancement affiché. */
const DUREE_ESTIMEE_APL = 150_000

function formaterMontant(valeur: number | string | null | undefined): string | null {
  const nombre = Number(valeur)
  if (valeur === null || valeur === undefined || valeur === '' || Number.isNaN(nombre)) return null
  return `${Math.round(nombre)} €/mois`
}

function lienSession(d: DemarcheN8n): string | undefined {
  const r = d.resultat_agent
  return r?.lien_public || r?.lien_session || r?.lien_session_simulateur || undefined
}

/** Traduit la démarche APL renvoyée par n8n en carte d'agent. */
export function agentAplDepuisN8n(d: DemarcheN8n | undefined, maintenant: number): AgentStatut {
  if (!d || !d.cochee || d.statut === 'proposee') {
    return { ...AGENT_APL, statut: 'attente', etape: 'En attente de démarrage…', progression: 0 }
  }

  const lienDirect = lienSession(d)
  const montant = formaterMontant(d.montant_estime)

  switch (d.statut) {
    case 'en_cours': {
      const debut = d.updated_at ? new Date(d.updated_at).getTime() : maintenant
      const ecoule = Math.max(0, maintenant - debut)
      const progression = Math.min(90, 5 + Math.round((ecoule / DUREE_ESTIMEE_APL) * 85))
      return {
        ...AGENT_APL,
        statut: 'en_cours',
        etape: "L'agent remplit le simulateur d'aide au logement sur caf.fr…",
        progression,
        lienDirect,
      }
    }
    case 'connexion_requise':
    case 'pret_a_valider':
    case 'envoyee':
      return {
        ...AGENT_APL,
        statut: 'termine',
        etape: 'Simulation terminée',
        progression: 100,
        resultat: montant ? `APL estimée : ${montant}` : 'Simulation terminée',
        lienDirect,
      }
    default:
      // bloquee ou statut inconnu : la simulation n'a pas abouti.
      return {
        ...AGENT_APL,
        statut: 'termine',
        etape: 'Simulation interrompue',
        progression: 100,
        resultat: "Simulation incomplète : on te guide pour la finir",
        lienDirect,
      }
  }
}

/**
 * Récupère les statuts des agents.
 * L'APL vient de n8n (agent H réel). Les prêts bancaires sont encore simulés pour la démo.
 */
export async function getStatutsAgents(): Promise<AgentStatut[]> {
  const maintenant = Date.now()
  const simules = calculerStatuts(obtenirEtatSimule(), maintenant).map((a) => ({ ...a, demo: true }))

  let apl: AgentStatut
  try {
    const etat = await lireEtat()
    apl = agentAplDepuisN8n(etat.demarches?.find((d) => d.aide_code === 'apl'), maintenant)
  } catch {
    apl = {
      ...AGENT_APL,
      statut: 'attente',
      etape: 'Connexion à Passerelle en cours…',
      progression: 0,
    }
  }

  return [apl, ...simules]
}

/**
 * Envoie la réponse de l'étudiant à un agent qui l'attend (code de vérification
 * ou information manquante). Seuls les agents simulés posent des questions pour l'instant.
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
