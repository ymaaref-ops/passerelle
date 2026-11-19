// Simulation FICTIVE de l'analyse des documents — sera remplacée par une vraie analyse (OCR / IA).
import { etudiantCourant as etudiant } from '@/lib/data'

export type DocumentRequis =
  | 'identite'
  | 'bail'
  | 'certificat_scolarite'
  | 'avis_imposition'
  | 'fiche_paie'
  | 'contrat_alternance'

export interface DefinitionDocument {
  type: DocumentRequis
  titre: string
  description: string
  /** Utile mais pas obligatoire pour continuer. */
  facultatif?: boolean
}

export const DOCUMENTS_REQUIS: DefinitionDocument[] = [
  {
    type: 'identite',
    titre: "Pièce d'identité",
    description: "Carte nationale d'identité ou passeport, recto-verso.",
  },
  {
    type: 'bail',
    titre: 'Bail',
    description: 'Ton contrat de location signé, avec le montant du loyer.',
  },
  {
    type: 'certificat_scolarite',
    titre: 'Certificat de scolarité',
    description: "Le certificat de ton école ou de ton CFA pour l'année en cours.",
  },
  {
    type: 'avis_imposition',
    titre: "Avis d'imposition des parents",
    description: "Le dernier avis d'imposition du foyer fiscal de tes parents.",
  },
  {
    type: 'fiche_paie',
    titre: 'Fiche de paie',
    description: 'Ta dernière fiche de paie (alternance ou job étudiant).',
  },
  {
    type: 'contrat_alternance',
    titre: "Contrat d'alternance",
    description: "Ton contrat d'apprentissage ou de professionnalisation (CERFA). Utile pour Mobili-Jeune.",
  },
]

/**
 * Documents demandés selon les réponses du questionnaire du début :
 * - bail : seulement si l'étudiant est locataire ;
 * - fiche de paie : seulement s'il travaille (job ou alternance) ;
 * - avis d'imposition des parents : facultatif, nécessaire pour simuler la bourse Crous ;
 * - contrat d'alternance : seulement en alternance, en facultatif (utile pour Mobili-Jeune).
 */
export function documentsPour(situation: { logement: string; activite: string; bourse?: string }): DefinitionDocument[] {
  return DOCUMENTS_REQUIS.flatMap((d): DefinitionDocument[] => {
    switch (d.type) {
      case 'bail':
        return situation.logement === 'locataire' ? [d] : []
      case 'fiche_paie':
        return situation.activite !== 'aucune' ? [d] : []
      case 'avis_imposition':
        // Facultatif : nécessaire seulement pour simuler la bourse Crous (revenus des parents).
        return [
          {
            ...d,
            facultatif: true,
            description: `${d.description} Nécessaire pour simuler ta bourse Crous, même si tu n'es pas encore boursier.`,
          },
        ]
      case 'contrat_alternance':
        return situation.activite === 'alternance' ? [{ ...d, facultatif: true }] : []
      default:
        return [d]
    }
  })
}

export const DUREE_ANALYSE_MS = 2000
export const TAILLE_MAX_OCTETS = 10 * 1024 * 1024
export const ANNEE_AVIS_ATTENDUE = 2025

/** Retourne une explication en clair si le fichier est inutilisable, sinon null. */
export function verifierFichier(fichier: File): string | null {
  const estImage = fichier.type.startsWith('image/')
  const estPdf = fichier.type === 'application/pdf'
  if (!estImage && !estPdf) {
    return "Ce fichier n'est ni une photo ni un PDF. Reprends ton document en photo ou envoie-le en PDF."
  }
  if (fichier.size > TAILLE_MAX_OCTETS) {
    return 'Ce fichier est trop lourd (10 Mo maximum). Reprends une photo moins volumineuse.'
  }
  return null
}

function formaterDate(iso: string): string {
  const [annee, mois, jour] = iso.split('-')
  return `${jour}/${mois}/${annee}`
}

/** Informations « lues » sur le document, issues des données fictives de l'étudiant. */
export function extraitDocument(type: DocumentRequis, avisValides: number): string {
  switch (type) {
    case 'identite':
      return `${etudiant.prenom} ${etudiant.nom} · née le ${formaterDate(etudiant.date_naissance)}`
    case 'bail':
      return `${etudiant.adresse} · loyer ${etudiant.loyer} € par mois`
    case 'certificat_scolarite':
      return `${etudiant.ecole} · année 2026-2027`
    case 'avis_imposition':
      return `Avis d'imposition ${avisValides >= 2 ? ANNEE_AVIS_ATTENDUE : ANNEE_AVIS_ATTENDUE - 1} · foyer ${etudiant.nom}`
    case 'fiche_paie':
      return `Salaire net ${etudiant.salaire_alternance} € par mois`
    case 'contrat_alternance':
      return "Contrat d'alternance"
  }
}

export interface Controle {
  id: string
  libelle: string
  ok: boolean
  document?: DocumentRequis
  erreur?: string
  detail?: string
}

/**
 * Contrôles croisés fictifs : seul l'avis d'imposition échoue au premier dépôt
 * (c'est l'avis 2024). Après remplacement par l'avis 2025, tout passe.
 */
export function getControles(avisValides: number): Controle[] {
  return [
    { id: 'nom', libelle: 'Même nom sur tous les documents', ok: true },
    { id: 'adresse', libelle: 'Adresse du bail cohérente', ok: true },
    {
      id: 'annee',
      libelle: "Avis d'imposition de la bonne année",
      ok: avisValides >= 2,
      document: 'avis_imposition',
      erreur: `Avis trop ancien : il faut celui de ${ANNEE_AVIS_ATTENDUE}`,
      detail: `Le document déposé est l'avis ${ANNEE_AVIS_ATTENDUE - 1}. Dépose celui de ${ANNEE_AVIS_ATTENDUE} pour que ton dossier soit accepté.`,
    },
  ]
}
