import type { ProfilCourant } from '@/lib/profil-courant'
import {
  formaterEurosCentimes,
  formaterTaux,
} from '@/lib/validation'

export interface DocumentPret {
  id: string
  titre: string
  description: string
  fichier: string
  contenu: (p: ProfilCourant) => string
}

const EN_ATTENTE =
  "Le comparateur de prêts n'a pas encore trouvé d'offre. Ce document sera prêt quand l'agent aura terminé la comparaison."

function budgetMensuel(p: ProfilCourant): string {
  const offre = p.offre
  const salaire = p.salaire ?? 0
  const apl = p.apl ?? 0
  const loyer = p.loyer ?? 0
  const revenus = salaire + apl
  const charges = loyer + (offre?.mensualite ?? 0)
  return [
    `BUDGET MENSUEL – ${p.nomComplet}`,
    '',
    'REVENUS',
    `- Salaire net : ${formaterEurosCentimes(salaire)}`,
    p.apl != null
      ? `- APL (simulateur CAF) : ${formaterEurosCentimes(apl)}`
      : "- APL : pas encore de résultat de la simulation CAF",
    `Total des revenus : ${formaterEurosCentimes(revenus)}`,
    '',
    'CHARGES',
    `- Loyer, charges comprises : ${p.loyer != null ? formaterEurosCentimes(loyer) : 'à compléter dans ton profil'}`,
    offre
      ? `- Mensualité du prêt étudiant (${offre.banque}) : ${formaterEurosCentimes(offre.mensualite)}`
      : '- Prêt étudiant : en attente du comparatif des banques',
    `Total des charges : ${formaterEurosCentimes(charges)}`,
    '',
    `RESTE POUR VIVRE : ${formaterEurosCentimes(revenus - charges)} par mois`,
    '',
    'Estimation établie par Passerelle à partir de tes documents et de ton profil.',
  ].join('\n')
}

function planRemboursement(p: ProfilCourant): string {
  const offre = p.offre
  if (!offre) return EN_ATTENTE
  const r = offre.taux / 100 / 12
  let restant = offre.montant
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
    `Montant emprunté : ${formaterEurosCentimes(offre.montant)}`,
    `TAEG annoncé : ${formaterTaux(offre.taux)} sur ${offre.duree} mois (plan indicatif, calculé avec ce taux)`,
    `Mensualité : ${formaterEurosCentimes(offre.mensualite)}`,
    `Total remboursé : ${formaterEurosCentimes(offre.coutTotal)} (dont ${formaterEurosCentimes(offre.interets)} de coût du crédit)`,
    '',
    'Mois | Mensualité | Capital | Intérêts | Reste dû',
    ...lignes,
  ].join('\n')
}

function lettreBanquier(p: ProfilCourant): string {
  const offre = p.offre
  if (!offre) return EN_ATTENTE
  const etudes = [p.formation, p.etablissement].filter(Boolean).join(' à ')
  const ressources = [
    p.salaire != null
      ? `Mes ressources mensuelles sont de ${formaterEurosCentimes(p.salaire)}${p.alternant ? " (salaire d'alternance)" : ''}`
      : "Je n'ai pas de salaire à ce jour",
    p.apl ? `, complétées par une APL de ${formaterEurosCentimes(p.apl)} selon le simulateur de la CAF` : '',
    '.',
    p.loyer != null ? ` Mon loyer s'élève à ${formaterEurosCentimes(p.loyer)}, charges comprises.` : '',
    ` Une mensualité de ${formaterEurosCentimes(offre.mensualite)} sur ${offre.duree} mois reste compatible avec mon budget.`,
  ].join('')
  return [
    p.nomComplet,
    p.adresse ?? '',
    '',
    `À l'attention du conseiller ${offre.banque}`,
    '',
    'Objet : demande de prêt étudiant',
    '',
    'Madame, Monsieur,',
    '',
    `${etudes ? `Inscrit(e) en ${etudes}` : 'Étudiant(e)'}${p.alternant ? ' et en alternance' : ''}, je souhaite financer mes études grâce à un prêt étudiant de ${formaterEurosCentimes(offre.montant)}.`,
    '',
    ressources,
    '',
    'Vous trouverez ci-joint les pièces justificatives de mon dossier.',
    '',
    'Je reste à votre disposition pour tout échange et vous prie de recevoir, Madame, Monsieur, mes salutations distinguées.',
    '',
    p.nomComplet,
  ].join('\n')
}

function checklistPieces(_p: ProfilCourant): string {
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
