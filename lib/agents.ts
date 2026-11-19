import { lireEtat, type DemarcheN8n } from '@/lib/n8n'

export type AgentId = 'apl' | 'prime-activite' | 'prets' | 'bourse' | 'visale' | 'mobili-jeune'

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
  /** Lien vers la session de l'agent sur H, quand il existe. */
  lienDirect?: string
  /** Agent de demande piloté par l'étudiant depuis sa carte (connexion à son compte). */
  bientot?: boolean
  /** Démarche cochée par l'étudiant et envoyée à n8n. */
  choisie?: boolean
  /** Agent arrêté avant la fin : `resultat` dit où il a bloqué. */
  interrompu?: boolean
  /** Pour le détail de la démarche : dernière mise à jour, remarques du simulateur, envoi fait. */
  majLe?: string
  remarques?: string
  envoyee?: boolean
}

/** Les agents H branchés, avec la démarche n8n qu'ils traitent. */
const AGENTS: {
  id: AgentId
  code: string
  nom: string
  site: string
  enCours: string
  /** Durée typique, pour estimer l'avancement affiché. */
  duree: number
  /** Agent pas encore activé (demande sur un vrai compte, clé H de son auteur à ajouter). */
  bientot?: boolean
}[] = [
  {
    id: 'apl',
    code: 'apl',
    nom: 'Simulation APL',
    site: 'caf.fr',
    enCours: "L'agent remplit le simulateur d'aide au logement sur caf.fr…",
    duree: 150_000,
  },
  {
    id: 'prime-activite',
    code: 'prime_activite',
    nom: "Simulation prime d'activité",
    site: 'caf.fr',
    enCours: "L'agent remplit le simulateur de prime d'activité sur caf.fr…",
    duree: 180_000,
  },
  {
    id: 'prets',
    code: 'pret_garanti',
    nom: 'Comparateur de prêts étudiants',
    site: 'sites des banques',
    enCours: 'Les agents simulent ton prêt dans chaque banque en parallèle…',
    duree: 300_000,
  },
  {
    id: 'bourse',
    code: 'bourse_crous',
    nom: 'Simulation bourse Crous',
    site: 'etudiant.gouv.fr',
    enCours: "L'agent remplit le simulateur de bourse sur critères sociaux…",
    duree: 180_000,
  },
  {
    id: 'visale',
    code: 'visale',
    nom: 'Demande Visale',
    site: 'visale.fr',
    enCours: '',
    duree: 0,
    bientot: true,
  },
  {
    id: 'mobili-jeune',
    code: 'mobili_jeune',
    nom: 'Demande Mobili-Jeune',
    site: 'mobilijeune.actionlogement.fr',
    enCours: '',
    duree: 0,
    bientot: true,
  },
]

const ETAPE_BIENTOT = "Tu lances l'agent quand tu veux : il prépare ta demande avec toi."

function formaterMontant(valeur: number | string | null | undefined, suffixe = ' €/mois'): string | null {
  const nombre = Number(valeur)
  if (valeur === null || valeur === undefined || valeur === '' || Number.isNaN(nombre)) return null
  return `${Math.round(nombre)}${suffixe}`
}

function lienSession(d: DemarcheN8n): string | undefined {
  const r = d.resultat_agent
  return r?.lien_public || r?.lien_session || r?.lien_session_simulateur || undefined
}

/** Résumé du résultat d'un agent terminé, selon l'aide. */
function resumeResultat(code: string, d: DemarcheN8n): string {
  const montant = formaterMontant(d.montant_estime)
  if (code === 'apl') return montant ? `APL estimée : ${montant}` : 'Simulation terminée'
  if (code === 'prime_activite') {
    if (Number(d.montant_estime) === 0) return "Pas de prime d'activité selon le simulateur"
    return montant ? `Prime d'activité estimée : ${montant}` : 'Simulation terminée'
  }
  if (code === 'bourse_crous') {
    const r = (d.resultat_agent?.reponse ?? {}) as Record<string, unknown>
    const echelon = r.echelon != null && r.echelon !== '' ? String(r.echelon) : null
    if (echelon && /non|aucun/i.test(echelon)) return "Pas de bourse selon le simulateur"
    const annuel = formaterMontant(r.montant_annuel as number | null, ' €/an')
    if (echelon) return `Échelon ${echelon}${annuel ? ` · ${annuel}` : montant ? ` · ${montant}` : ''}`
    return montant ? `Bourse estimée : ${montant}` : 'Simulation terminée'
  }
  if (code === 'pret_garanti') {
    const resultats = d.resultat_agent?.reponse?.resultats
    const n = Array.isArray(resultats) ? resultats.length : 0
    return n > 0 ? `${n} banque${n > 1 ? 's' : ''} comparée${n > 1 ? 's' : ''} : voir le détail` : 'Comparaison terminée'
  }
  return 'Démarche terminée'
}

/** Traduit une démarche renvoyée par n8n en carte d'agent. */
function agentDepuisN8n(a: (typeof AGENTS)[number], d: DemarcheN8n | undefined, maintenant: number): AgentStatut {
  const choisie = Boolean(d?.cochee) && d?.statut !== 'proposee'
  const base = {
    id: a.id,
    nom: a.nom,
    site: a.site,
    choisie,
    majLe: d?.updated_at ?? undefined,
    remarques: d?.resultat_agent?.simulation?.remarques || undefined,
  }
  if (a.bientot) return { ...base, statut: 'attente', etape: ETAPE_BIENTOT, progression: 0, bientot: true }
  if (!d || !d.cochee || d.statut === 'proposee') {
    return { ...base, statut: 'attente', etape: 'En attente de démarrage…', progression: 0 }
  }
  const lienDirect = lienSession(d)

  switch (d.statut) {
    case 'en_cours': {
      const debut = d.updated_at ? new Date(d.updated_at).getTime() : maintenant
      const ecoule = Math.max(0, maintenant - debut)
      const progression = Math.min(90, 5 + Math.round((ecoule / a.duree) * 85))
      return { ...base, statut: 'en_cours', etape: a.enCours, progression, lienDirect }
    }
    case 'connexion_requise':
    case 'pret_a_valider':
    case 'envoyee':
      return {
        ...base,
        statut: 'termine',
        etape: 'Terminé',
        progression: 100,
        resultat: resumeResultat(a.code, d),
        lienDirect,
        envoyee: d.statut === 'envoyee',
      }
    default:
      return {
        ...base,
        statut: 'termine',
        etape: 'Interrompu',
        progression: 100,
        resultat: d.resultat_agent?.etape_bloquante || 'Incomplet : on te guide pour finir',
        interrompu: true,
        lienDirect,
      }
  }
}

/** Mémoire des aides cochées à l'étape Choix (pour la page de suivi ouverte depuis le menu). */
export const CLE_AIDES_CHOISIES = 'passerelle_aides_choisies'

export function enregistrerAidesChoisies(aides: string[]): void {
  try {
    window.sessionStorage.setItem(CLE_AIDES_CHOISIES, aides.join(','))
  } catch {
    // Stockage indisponible.
  }
}

export function lireAidesChoisies(): string | null {
  try {
    return window.sessionStorage.getItem(CLE_AIDES_CHOISIES)
  } catch {
    return null
  }
}

/** Statuts affichés avant la première lecture : identiques côté serveur et client. */
export function statutsInitiaux(): AgentStatut[] {
  return AGENTS.map((a) => ({
    id: a.id,
    nom: a.nom,
    site: a.site,
    statut: 'attente',
    etape: a.bientot ? ETAPE_BIENTOT : 'En attente de démarrage…',
    progression: 0,
    bientot: a.bientot,
  }))
}

/** Récupère les statuts des agents H depuis n8n. */
export async function getStatutsAgents(): Promise<AgentStatut[]> {
  const maintenant = Date.now()
  try {
    const etat = await lireEtat()
    return AGENTS.map((a) =>
      agentDepuisN8n(
        a,
        etat.demarches?.find((d) => d.aide_code === a.code),
        maintenant,
      ),
    )
  } catch {
    return statutsInitiaux().map((s) => (s.bientot ? s : { ...s, etape: 'Connexion à Passerelle en cours…' }))
  }
}

/** Les agents H actuels ne posent pas de question en cours de route. */
export async function envoyerReponseAgent(_agentId: AgentId, _reponse: string): Promise<void> {
  throw new Error("Cet agent n'attend pas de réponse pour le moment.")
}
