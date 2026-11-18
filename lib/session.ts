// Mémorise, pour la session de l'étudiant, que ses documents ont tous été vérifiés.
// Tant que ce n'est pas le cas, les étapes Aides et Choix renvoient vers Documents.

const CLE_DOCUMENTS = 'passerelle_documents_valides'

export function documentsValides(): boolean {
  try {
    return window.sessionStorage.getItem(CLE_DOCUMENTS) === 'oui'
  } catch {
    return false
  }
}

export function marquerDocumentsValides(valides: boolean): void {
  try {
    if (valides) window.sessionStorage.setItem(CLE_DOCUMENTS, 'oui')
    else window.sessionStorage.removeItem(CLE_DOCUMENTS)
  } catch {
    // Stockage indisponible : rien à faire.
  }
}

// Situation de l'étudiant, donnée à l'étape « Ta situation ».
export type Logement = 'locataire' | 'parents' | 'cherche'
export type Activite = 'alternance' | 'job' | 'aucune'
export type Bourse = 'oui' | 'non' | 'ne_sais_pas'

export interface Situation {
  logement: Logement
  activite: Activite
  bourse: Bourse
  /** Revenus nets des 12 derniers mois, en euros. */
  ressources: number
}

const CLE_SITUATION = 'passerelle_situation'

export function lireSituation(): Situation | null {
  try {
    const brut = window.sessionStorage.getItem(CLE_SITUATION)
    return brut ? (JSON.parse(brut) as Situation) : null
  } catch {
    return null
  }
}

export function enregistrerSituation(situation: Situation): void {
  try {
    window.sessionStorage.setItem(CLE_SITUATION, JSON.stringify(situation))
    // Nouvelle situation : les documents doivent être (re)vérifiés.
    window.sessionStorage.removeItem(CLE_DOCUMENTS)
  } catch {
    // Stockage indisponible : rien à faire.
  }
}
