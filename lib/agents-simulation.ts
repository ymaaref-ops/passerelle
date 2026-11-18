import type { AgentId, AgentStatut, DemandeAgent } from '@/lib/agents'

/** Durée pendant laquelle la carte affiche « Merci, l'agent reprend… » après une réponse. */
const DUREE_REPRISE = 2500

interface Jalon {
  /** Délai en ms depuis le début de la phase. */
  at: number
  texte: string
  progression: number
}

interface Scenario {
  id: AgentId
  nom: string
  site: string
  /** Délai avant que l'agent ne démarre. */
  delai: number
  avant: Jalon[]
  /** Si présent, l'agent s'arrête pour demander quelque chose à l'étudiant. */
  blocage?: { at: number; progression: number; etape: string; demande: DemandeAgent }
  /** Jalons après la reprise (relatifs à la fin de la reprise). */
  apres: Jalon[]
  /** Fin de la phase concernée (avant la fin si aucun blocage, après la reprise sinon). */
  fin: number
  resultat: string
}

// Prêts bancaires : pas encore d'agent H, scénarios simulés pour la démo.
// L'APL, elle, vient de n8n (voir lib/agents.ts).
const SCENARIOS: Scenario[] = [
  {
    id: 'banque-postale',
    nom: 'Prêt étudiant – La Banque Postale',
    site: 'labanquepostale.fr',
    delai: 1500,
    avant: [
      { at: 0, texte: 'Ouvre le simulateur de prêt étudiant…', progression: 8 },
      { at: 2500, texte: 'Remplit ton profil étudiant…', progression: 30 },
    ],
    blocage: {
      at: 5000,
      progression: 45,
      etape: 'Attend le code de vérification…',
      demande: {
        type: 'code',
        question: "Un code vient de t'être envoyé par mail. Recopie-le ici :",
      },
    },
    apres: [
      { at: 0, texte: 'Compare les taux…', progression: 60 },
      { at: 3000, texte: 'Prépare ton offre…', progression: 85 },
    ],
    fin: 6000,
    resultat: 'Prêt jusqu’à 15 000 € · taux dès 3,05 %',
  },
  {
    id: 'societe-generale',
    nom: 'Prêt étudiant – Société Générale',
    site: 'societegenerale.fr',
    delai: 3000,
    avant: [
      { at: 0, texte: "Ouvre l'espace prêt étudiant…", progression: 8 },
      { at: 3000, texte: 'Remplit ton profil étudiant…', progression: 30 },
    ],
    blocage: {
      at: 6500,
      progression: 50,
      etape: "Attend une information sur ton contrat d'alternance…",
      demande: {
        type: 'info',
        question: "Quelle est la date de début de ton contrat d'alternance ?",
        champ: 'date',
      },
    },
    apres: [
      { at: 0, texte: 'Vérifie les conditions de ton contrat…', progression: 65 },
      { at: 3000, texte: 'Compare les taux…', progression: 85 },
    ],
    fin: 5500,
    resultat: 'Prêt jusqu’à 15 000 € · taux dès 3,20 %',
  },
  {
    id: 'cic',
    nom: 'Prêt étudiant – CIC',
    site: 'cic.fr',
    delai: 4500,
    avant: [
      { at: 0, texte: 'Ouvre le simulateur de prêt étudiant…', progression: 5 },
      { at: 3000, texte: 'Remplit ton profil étudiant…', progression: 30 },
      { at: 6000, texte: 'Compare les taux…', progression: 60 },
      { at: 9000, texte: 'Prépare ton offre…', progression: 85 },
    ],
    apres: [],
    fin: 11500,
    resultat: 'Prêt jusqu’à 20 000 € · taux dès 3,10 %',
  },
]

export interface EtatSimule {
  debut: number
  reponses: Partial<Record<AgentId, { at: number; valeur: string }>>
}

let etat: EtatSimule | null = null

/** État en mémoire : le scénario démarre à la première lecture et survit à la navigation. */
export function obtenirEtatSimule(): EtatSimule {
  if (!etat) etat = { debut: Date.now(), reponses: {} }
  return etat
}

function interpoler(jalons: Jalon[], t: number, finAt: number, finProgression: number) {
  let i = 0
  while (i + 1 < jalons.length && jalons[i + 1].at <= t) i++
  const courant = jalons[i]
  const suivantAt = jalons[i + 1]?.at ?? finAt
  const suivantProgression = jalons[i + 1]?.progression ?? finProgression
  const duree = Math.max(suivantAt - courant.at, 1)
  const ratio = Math.min(Math.max((t - courant.at) / duree, 0), 1)
  return {
    etape: courant.texte,
    progression: Math.round(courant.progression + (suivantProgression - courant.progression) * ratio),
  }
}

function calculerAgent(s: Scenario, etat: EtatSimule, maintenant: number): AgentStatut {
  const base = { id: s.id, nom: s.nom, site: s.site }
  const t = maintenant - etat.debut - s.delai

  if (t < 0) {
    return { ...base, statut: 'attente', etape: 'En attente de démarrage…', progression: 0 }
  }

  const termine: AgentStatut = {
    ...base,
    statut: 'termine',
    etape: 'Démarche terminée',
    progression: 100,
    resultat: s.resultat,
  }

  if (!s.blocage) {
    if (t >= s.fin) return termine
    return { ...base, statut: 'en_cours', ...interpoler(s.avant, t, s.fin, 95) }
  }

  if (t < s.blocage.at) {
    return {
      ...base,
      statut: 'en_cours',
      ...interpoler(s.avant, t, s.blocage.at, s.blocage.progression),
    }
  }

  const reponse = etat.reponses[s.id]
  if (!reponse) {
    return {
      ...base,
      statut: 'besoin',
      etape: s.blocage.etape,
      progression: s.blocage.progression,
      demande: s.blocage.demande,
    }
  }

  const depuisReponse = maintenant - reponse.at
  if (depuisReponse < DUREE_REPRISE) {
    return {
      ...base,
      statut: 'en_cours',
      etape: "Merci, l'agent reprend…",
      progression: s.blocage.progression,
      reprise: true,
    }
  }

  const u = depuisReponse - DUREE_REPRISE
  if (u >= s.fin) return termine
  return { ...base, statut: 'en_cours', ...interpoler(s.apres, u, s.fin, 95) }
}

export function calculerStatuts(etat: EtatSimule, maintenant: number): AgentStatut[] {
  return SCENARIOS.map((s) => calculerAgent(s, etat, maintenant))
}

/** Statuts rendus avant la première lecture : identiques côté serveur et client. */
export function statutsInitiaux(): AgentStatut[] {
  const apl: AgentStatut = {
    id: 'apl',
    nom: 'Simulation APL',
    site: 'caf.fr',
    statut: 'attente',
    etape: 'En attente de démarrage…',
    progression: 0,
  }
  const simules = calculerStatuts({ debut: 0, reponses: {} }, 0).map((a) => ({ ...a, demo: true }))
  return [apl, ...simules]
}
