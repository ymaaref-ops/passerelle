// Données FICTIVES — seront remplacées plus tard par une base Supabase.

export type CategorieAide = 'Études' | 'Logement' | 'Vie quotidienne' | 'Travail'
export type NiveauAide = 'automatisee' | 'guidee' | 'information'

export interface Aide {
  id: string
  nom: string
  explication: string
  categorie: CategorieAide
  montant_estime: string
  conditions: string
  date_limite: string | null
  lien_officiel: string
  source: string
  date_verification: string
  niveau: NiveauAide
  regle_eligibilite: string
}

export interface Etudiant {
  id: string
  prenom: string
  nom: string
  date_naissance: string
  adresse: string
  ecole: string
  alternant: boolean
  salaire_alternance: number
  loyer: number
  colocation: boolean
  meuble: boolean
}

export type TypeDocument =
  | 'identite'
  | 'bail'
  | 'certificat_scolarite'
  | 'avis_imposition'
  | 'fiche_paie'

export type StatutDocument = 'ok' | 'anomalie' | 'manquant'

export interface Document {
  id: string
  etudiant_id: string
  type: TypeDocument
  statut: StatutDocument
  anomalie: string | null
  donnees_extraites: Record<string, unknown> | null
}

export type StatutDemarche =
  | 'en_attente'
  | 'en_cours'
  | 'connexion_requise'
  | 'a_valider'
  | 'envoyee'
  | 'guidee_a_faire'

export interface Demarche {
  id: string
  etudiant_id: string
  aide_id: string
  statut: StatutDemarche
  resultat_agent: string | null
  montant_obtenu: number | null
  date_validation: string | null
}

const DATE_VERIFICATION = '2026-11-10'

export const aides: Aide[] = [
  {
    id: 'apl',
    nom: 'APL (CAF)',
    explication:
      'Une aide mensuelle de la CAF qui réduit ton loyer si tu es locataire, même en logement étudiant ou en location meublée. La simulation se fait sur caf.fr.',
    categorie: 'Logement',
    montant_estime: "Jusqu'à 230 €/mois",
    conditions:
      'Être locataire de sa résidence principale, avoir des ressources sous un certain plafond, loyer conforme aux plafonds. Simulation APL : caf.fr.',
    date_limite: null,
    lien_officiel: 'https://www.caf.fr',
    source: 'caf.fr',
    date_verification: DATE_VERIFICATION,
    niveau: 'automatisee',
    regle_eligibilite: 'locataire = true ET loyer > 0 ET ressources <= plafond_apl',
  },
  {
    id: 'prime-activite',
    nom: "Prime d'activité (CAF)",
    explication:
      "Un complément de revenu versé par la CAF aux travailleurs aux revenus modestes, alternants compris à partir d'un certain salaire.",
    categorie: 'Travail',
    montant_estime: '≈ 150 €/mois',
    conditions:
      'Avoir 18 ans ou plus, travailler en France et percevoir un salaire net supérieur à environ 1 000 € par mois sur 3 mois.',
    date_limite: null,
    lien_officiel: 'https://www.service-public.fr/particuliers/vosdroits/F2882',
    source: 'service-public.fr',
    date_verification: DATE_VERIFICATION,
    niveau: 'automatisee',
    regle_eligibilite: 'age >= 18 ET salaire_net_mensuel >= 1000',
  },
  {
    id: 'pret-sg',
    nom: 'Prêt étudiant Société Générale',
    explication:
      'Un prêt à taux avantageux pour financer tes études ou ton installation, avec possibilité de différé de remboursement.',
    categorie: 'Études',
    montant_estime: "Jusqu'à 15 000 €",
    conditions:
      "Avoir entre 18 et 28 ans, être inscrit dans un établissement d'enseignement supérieur, avoir une caution ou une garantie.",
    date_limite: null,
    lien_officiel: 'https://particuliers.sg.fr/pret-etudiant',
    source: 'particuliers.sg.fr',
    date_verification: DATE_VERIFICATION,
    niveau: 'automatisee',
    regle_eligibilite: 'age <= 28 ET inscrit_enseignement_superieur = true',
  },
  {
    id: 'pret-cic',
    nom: 'Prêt étudiant CIC',
    explication:
      "Un prêt étudiant avec remboursement différé jusqu'à la fin de tes études, pour financer scolarité, logement ou équipement.",
    categorie: 'Études',
    montant_estime: "Jusqu'à 20 000 €",
    conditions:
      "Avoir entre 18 et 28 ans, être inscrit dans l'enseignement supérieur, présenter une caution ou une garantie.",
    date_limite: null,
    lien_officiel: 'https://www.cic.fr/fr/particuliers/credits/pret-etudiant.html',
    source: 'cic.fr',
    date_verification: DATE_VERIFICATION,
    niveau: 'automatisee',
    regle_eligibilite: 'age <= 28 ET inscrit_enseignement_superieur = true',
  },
  {
    id: 'pret-lbp',
    nom: 'Prêt étudiant La Banque Postale',
    explication:
      'Un prêt pour financer tes études avec des mensualités adaptées à ta situation et des frais de dossier réduits.',
    categorie: 'Études',
    montant_estime: "Jusqu'à 15 000 €",
    conditions:
      "Avoir entre 18 et 28 ans, être inscrit dans un établissement d'enseignement supérieur.",
    date_limite: null,
    lien_officiel: 'https://www.labanquepostale.fr/particuliers/jeunes/pret-etudiant.html',
    source: 'labanquepostale.fr',
    date_verification: DATE_VERIFICATION,
    niveau: 'automatisee',
    regle_eligibilite: 'age <= 28 ET inscrit_enseignement_superieur = true',
  },
  {
    id: 'pret-etat',
    nom: "Prêt étudiant garanti par l'État",
    explication:
      "Un prêt sans caution parentale ni condition de ressources, garanti par l'État et proposé par plusieurs banques partenaires.",
    categorie: 'Études',
    montant_estime: "Jusqu'à 20 000 €",
    conditions:
      "Avoir 28 ans maximum, être de nationalité française ou résident de l'UE, être inscrit dans l'enseignement supérieur.",
    date_limite: null,
    lien_officiel: 'https://www.service-public.fr/particuliers/vosdroits/F2735',
    source: 'service-public.fr',
    date_verification: DATE_VERIFICATION,
    niveau: 'automatisee',
    regle_eligibilite: 'age <= 28 ET inscrit_enseignement_superieur = true',
  },
  {
    id: 'bourse-crous',
    nom: 'Bourse CROUS',
    explication:
      "Une aide financière versée chaque mois pendant l'année universitaire, selon les revenus de ta famille et ta situation.",
    categorie: 'Études',
    montant_estime: 'De 1 454 € à 6 335 €/an',
    conditions:
      'Être inscrit en formation initiale, avoir moins de 28 ans, avoir des ressources sous les plafonds du CROUS.',
    date_limite: '2027-05-15',
    lien_officiel: 'https://www.messervices.etudiant.gouv.fr',
    source: 'messervices.etudiant.gouv.fr',
    date_verification: DATE_VERIFICATION,
    niveau: 'automatisee',
    regle_eligibilite: 'age < 28 ET ressources_foyer <= plafond_crous',
  },
  {
    id: 'visale',
    nom: 'Visale',
    explication:
      "Une caution gratuite d'Action Logement qui rassure ton propriétaire : pas besoin de garant physique pour louer.",
    categorie: 'Logement',
    montant_estime: 'Caution gratuite',
    conditions:
      "Avoir entre 18 et 30 ans, être étudiant ou alternant, louer un logement dont le loyer respecte les plafonds de l'aide.",
    date_limite: null,
    lien_officiel: 'https://www.visale.fr',
    source: 'visale.fr',
    date_verification: DATE_VERIFICATION,
    niveau: 'guidee',
    regle_eligibilite: 'age <= 30 ET (etudiant = true OU alternant = true)',
  },
  {
    id: 'mobili-jeune',
    nom: 'Mobili-Jeune',
    explication:
      "Une aide d'Action Logement qui prend en charge une partie de ton loyer pendant ta formation en alternance.",
    categorie: 'Logement',
    montant_estime: '10 € à 100 €/mois',
    conditions:
      "Avoir moins de 30 ans, être en alternance dans une entreprise du secteur privé non agricole, payer un loyer.",
    date_limite: null,
    lien_officiel: 'https://www.actionlogement.fr/l-aide-mobili-jeune',
    source: 'actionlogement.fr',
    date_verification: DATE_VERIFICATION,
    niveau: 'guidee',
    regle_eligibilite: 'age < 30 ET alternant = true ET loyer > 0',
  },
  {
    id: 'loca-pass',
    nom: 'Loca-Pass',
    explication:
      "Une avance gratuite d'Action Logement pour payer ton dépôt de garantie quand tu entres dans un nouveau logement.",
    categorie: 'Logement',
    montant_estime: "Avance jusqu'à 1 200 €",
    conditions:
      'Être étudiant ou alternant, avoir moins de 30 ans, signer un bail dans les 2 mois suivant la demande.',
    date_limite: null,
    lien_officiel: 'https://www.actionlogement.fr/l-avance-loca-pass',
    source: 'actionlogement.fr',
    date_verification: DATE_VERIFICATION,
    niveau: 'guidee',
    regle_eligibilite: 'age < 30 ET (etudiant = true OU alternant = true)',
  },
  {
    id: 'aide-mobilite',
    nom: 'Aide à la mobilité',
    explication:
      "Une aide pour couvrir les frais de déménagement quand tu changes de région pour poursuivre tes études en master.",
    categorie: 'Études',
    montant_estime: '1 000 € (versement unique)',
    conditions:
      "Être boursier, passer de la licence au master et changer de région académique.",
    date_limite: '2027-01-31',
    lien_officiel: 'https://www.service-public.fr/particuliers/vosdroits/F34325',
    source: 'service-public.fr',
    date_verification: DATE_VERIFICATION,
    niveau: 'information',
    regle_eligibilite: 'boursier = true ET changement_region = true ET niveau = master',
  },
  {
    id: 'aide-urgence-crous',
    nom: "Aide d'urgence CROUS",
    explication:
      "Une aide ponctuelle pour les étudiants qui traversent une difficulté soudaine : rupture familiale, perte d'emploi, imprévu financier.",
    categorie: 'Vie quotidienne',
    montant_estime: 'De 100 € à 2 000 €',
    conditions:
      "Rencontrer des difficultés financières graves et ponctuelles, être étudiant, contacter l'assistante sociale du CROUS.",
    date_limite: null,
    lien_officiel: 'https://www.etudiant.gouv.fr/fr/les-aides-specifiques-1237',
    source: 'etudiant.gouv.fr',
    date_verification: DATE_VERIFICATION,
    niveau: 'information',
    regle_eligibilite: 'difficulte_financiere_ponctuelle = true',
  },
]

export const etudiants: Etudiant[] = [
  {
    id: 'etu-lea-martin',
    prenom: 'Léa',
    nom: 'Martin',
    date_naissance: '2005-03-14',
    adresse: '12 rue des Lilas, 75019 Paris',
    ecole: 'Université Paris Cité — Master 1',
    alternant: true,
    salaire_alternance: 1100,
    loyer: 650,
    colocation: false,
    meuble: true,
  },
]

export const documents: Document[] = []

export const demarches: Demarche[] = []

export const etudiantCourant = etudiants[0]

export const CATEGORIES: CategorieAide[] = ['Logement', 'Études', 'Travail', 'Vie quotidienne']

export const NIVEAUX: Record<NiveauAide, { label: string; description: string }> = {
  automatisee: {
    label: 'Démarche automatisée',
    description: "Nos agents IA remplissent le dossier pour toi.",
  },
  guidee: {
    label: 'Démarche guidée',
    description: 'On te guide pas à pas, tu déposes toi-même.',
  },
  information: {
    label: 'Pour information',
    description: 'On t’explique l’aide et où la demander.',
  },
}

export function calculerAge(dateNaissance: string, aujourdhui = new Date('2026-11-17')): number {
  const naissance = new Date(dateNaissance)
  let age = aujourdhui.getFullYear() - naissance.getFullYear()
  const anniversairePasse =
    aujourdhui.getMonth() > naissance.getMonth() ||
    (aujourdhui.getMonth() === naissance.getMonth() && aujourdhui.getDate() >= naissance.getDate())
  if (!anniversairePasse) age -= 1
  return age
}
