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
