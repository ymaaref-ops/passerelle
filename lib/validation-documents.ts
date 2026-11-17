import {
  APL_ESTIMEE,
  ETUDIANT,
  MEILLEURE_OFFRE,
  MONTANT_PRET,
  formaterEurosCentimes,
  formaterTaux,
} from '@/lib/validation'

export interface DocumentPret {
  id: string
  titre: string
  description: string
  fichier: string
  contenu: () => string
}

const NOM_COMPLET = `${ETUDIANT.prenom} ${ETUDIANT.nom}`
const LOYER = 650
const SALAIRE = 1100

function budgetMensuel(): string {
  const offre = MEILLEURE_OFFRE
  const revenus = SALAIRE + APL_ESTIMEE
  const charges = LOYER + offre.mensualite
  return [
    `BUDGET MENSUEL – ${NOM_COMPLET}`,
    '',
    'REVENUS',
    `- Salaire d'alternance : ${formaterEurosCentimes(SALAIRE)}`,
    `- APL estimée : ${formaterEurosCentimes(APL_ESTIMEE)}`,
    `Total des revenus : ${formaterEurosCentimes(revenus)}`,
    '',
    'CHARGES',
    `- Loyer, charges comprises : ${formaterEurosCentimes(LOYER)}`,
    `- Mensualité du prêt étudiant (${offre.banque}) : ${formaterEurosCentimes(offre.mensualite)}`,
    `Total des charges : ${formaterEurosCentimes(charges)}`,
    '',
    `RESTE POUR VIVRE : ${formaterEurosCentimes(revenus - charges)} par mois`,
    '',
    'Estimation établie par Passerelle à partir des informations que tu as relues.',
  ].join('\n')
}

function planRemboursement(): string {
  const offre = MEILLEURE_OFFRE
  const r = offre.taux / 100 / 12
  let restant = MONTANT_PRET
  const lignes: string[] = []
  for (let mois = 1; mois <= offre.duree; mois += 1) {
    const interets = restant * r
    const capital = offre.mensualite - interets
    restant = Math.max(0, restant - capital)
    lignes.push(
      `${String(mois).padStart(2, ' ')} | ${formaterEurosCentimes(offre.mensualite)} | ${formaterEurosCentimes(capital)} | ${formaterEurosCentimes(interets)} | ${formaterEurosCentimes(restant)}`,
    )
  }
  return [
    `PLAN DE REMBOURSEMENT – ${offre.banque}`,
    '',
    `Montant emprunté : ${formaterEurosCentimes(MONTANT_PRET)}`,
    `Taux annuel : ${formaterTaux(offre.taux)} sur ${offre.duree} mois`,
    `Mensualité : ${formaterEurosCentimes(offre.mensualite)}`,
    `Coût total : ${formaterEurosCentimes(offre.coutTotal)} (dont ${formaterEurosCentimes(offre.interets)} d'intérêts)`,
    '',
    'Mois | Mensualité | Capital | Intérêts | Reste dû',
    ...lignes,
  ].join('\n')
}

function lettreBanquier(): string {
  const offre = MEILLEURE_OFFRE
  return [
    NOM_COMPLET,
    ETUDIANT.adresse,
    '',
    `À l'attention du conseiller ${offre.banque}`,
    '',
    'Objet : demande de prêt étudiant',
    '',
    'Madame, Monsieur,',
    '',
    `Étudiante en Master 1 à l'Université Paris Cité et en alternance, je souhaite financer mes études grâce à un prêt étudiant de ${formaterEurosCentimes(MONTANT_PRET)}.`,
    '',
    `Mes ressources mensuelles sont de ${formaterEurosCentimes(SALAIRE)} (salaire d'alternance), complétées par une APL estimée à ${formaterEurosCentimes(APL_ESTIMEE)}. Mon loyer s'élève à ${formaterEurosCentimes(LOYER)}, charges comprises. Une mensualité de ${formaterEurosCentimes(offre.mensualite)} sur ${offre.duree} mois reste compatible avec mon budget.`,
    '',
    'Vous trouverez ci-joint les pièces justificatives de mon dossier.',
    '',
    'Je reste à votre disposition pour tout échange et vous prie de recevoir, Madame, Monsieur, mes salutations distinguées.',
    '',
    NOM_COMPLET,
  ].join('\n')
}

function checklistPieces(): string {
  const pieces: [boolean, string][] = [
    [true, "Pièce d'identité"],
    [true, 'Bail (justificatif de domicile)'],
    [true, 'Certificat de scolarité'],
    [true, "Avis d'imposition 2025 des parents"],
    [false, "Contrat d'alternance (à demander à ton employeur si la banque le réclame)"],
    [false, "RIB (à télécharger depuis ton espace bancaire)"],
  ]
  return [
    'CHECKLIST DES PIÈCES DU DOSSIER – prêt étudiant',
    '',
    ...pieces.map(([ok, nom]) => `[${ok ? 'x' : ' '}] ${nom}`),
    '',
    'Les pièces cochées sont déjà vérifiées par Passerelle.',
  ].join('\n')
}

export const DOCUMENTS_PRETS: DocumentPret[] = [
  {
    id: 'budget',
    titre: 'Budget mensuel',
    description: 'Tes revenus, ton loyer et la mensualité du prêt, pour voir ce qu’il te reste.',
    fichier: 'budget-mensuel.txt',
    contenu: budgetMensuel,
  },
  {
    id: 'plan',
    titre: 'Plan de remboursement du prêt',
    description: 'Mois par mois, ce que tu rembourses avec la meilleure offre.',
    fichier: 'plan-de-remboursement.txt',
    contenu: planRemboursement,
  },
  {
    id: 'lettre',
    titre: 'Lettre de présentation au banquier',
    description: 'Une lettre prête à joindre à ta demande, avec ta situation.',
    fichier: 'lettre-au-banquier.txt',
    contenu: lettreBanquier,
  },
  {
    id: 'checklist',
    titre: 'Checklist des pièces du dossier',
    description: 'Les pièces à fournir, avec celles qui sont déjà vérifiées.',
    fichier: 'checklist-pieces.txt',
    contenu: checklistPieces,
  },
]

export const NOMS_PIECES_JOINTES = DOCUMENTS_PRETS.map((d) => d.fichier)
