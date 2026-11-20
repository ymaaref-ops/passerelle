import type { ProfilCourant } from '@/lib/profil-courant'
import { creerPdf, type Bloc } from '@/lib/pdf-simple'
import { formaterEurosCentimes, formaterTaux } from '@/lib/validation'

export interface DocumentPret {
  id: string
  titre: string
  description: string
  fichier: string
  /** Contenu mis en page (blocs du PDF). */
  blocs: (p: ProfilCourant) => Bloc[]
}

/** Le document au format PDF, prêt à télécharger. */
export function documentPdf(d: DocumentPret, p: ProfilCourant): Uint8Array {
  return creerPdf(d.titre, d.blocs(p))
}

const EN_ATTENTE: Bloc[] = [
  {
    type: 'paragraphe',
    texte:
      "Le comparateur de prêts n'a pas encore trouvé d'offre. Ce document sera prêt quand l'agent aura terminé la comparaison.",
  },
]

const aujourdhui = () => new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

interface Echeance {
  mois: number
  mensualite: number
  capital: number
  interets: number
  reste: number
}

const arrondi = (n: number) => Math.round(n * 100) / 100

/** Tableau d'amortissement classique (mensualités constantes), juste au centime près jusqu'à la dernière échéance. */
export function amortissement(montant: number, tauxAnnuel: number, duree: number) {
  const r = tauxAnnuel / 100 / 12
  const mensualite = arrondi(r > 0 ? (montant * r) / (1 - (1 + r) ** -duree) : montant / duree)
  const echeances: Echeance[] = []
  let reste = montant
  for (let mois = 1; mois <= duree; mois += 1) {
    const interets = arrondi(reste * r)
    // Dernière échéance : on solde exactement le capital restant.
    const capital = mois === duree ? reste : arrondi(mensualite - interets)
    const paye = mois === duree ? arrondi(capital + interets) : mensualite
    reste = Math.max(0, arrondi(reste - capital))
    echeances.push({ mois, mensualite: paye, capital, interets, reste })
  }
  const total = arrondi(echeances.reduce((a, e) => a + e.mensualite, 0))
  return { mensualite, echeances, total, cout: arrondi(total - montant) }
}

/** Mensualité recalculée à partir du montant, du TAEG et de la durée. */
function mensualiteDe(offre: NonNullable<ProfilCourant['offre']>): number {
  return amortissement(offre.montant, offre.taux, offre.duree).mensualite
}

function budgetMensuel(p: ProfilCourant): Bloc[] {
  const offre = p.offre
  const mensualite = offre ? mensualiteDe(offre) : 0
  const salaire = p.salaire ?? 0
  const apl = p.apl ?? 0
  const loyer = p.loyer ?? 0
  const revenus = salaire + apl
  const charges = loyer + mensualite
  return [
    { type: 'titre', texte: 'Budget mensuel' },
    { type: 'note', texte: `${p.nomComplet} · établi le ${aujourdhui()}` },
    { type: 'sousTitre', texte: 'Revenus' },
    {
      type: 'lignes',
      lignes: [
        ['Salaire net', formaterEurosCentimes(salaire)],
        ['APL (simulateur CAF)', p.apl != null ? formaterEurosCentimes(apl) : 'en attente de la simulation'],
      ],
    },
    { type: 'total', libelle: 'Total des revenus', valeur: formaterEurosCentimes(revenus) },
    { type: 'sousTitre', texte: 'Charges' },
    {
      type: 'lignes',
      lignes: [
        ['Loyer, charges comprises', p.loyer != null ? formaterEurosCentimes(loyer) : 'à compléter dans ton profil'],
        [
          offre ? `Mensualité du prêt étudiant (${offre.banque})` : 'Prêt étudiant',
          offre ? formaterEurosCentimes(mensualite) : 'en attente du comparatif',
        ],
      ],
    },
    { type: 'total', libelle: 'Total des charges', valeur: formaterEurosCentimes(charges) },
    { type: 'espace' },
    { type: 'total', libelle: 'Reste pour vivre, par mois', valeur: formaterEurosCentimes(revenus - charges), accent: true },
    { type: 'note', texte: 'Estimation établie par Passerelle à partir de tes documents et de ton profil.' },
  ]
}

function planRemboursement(p: ProfilCourant): Bloc[] {
  const offre = p.offre
  if (!offre) return EN_ATTENTE
  const plan = amortissement(offre.montant, offre.taux, offre.duree)
  const ecart = Math.abs(offre.mensualite - plan.mensualite) / plan.mensualite > 0.03
  const blocs: Bloc[] = [
    { type: 'titre', texte: `Plan de remboursement – ${offre.banque}` },
    { type: 'note', texte: `${p.nomComplet} · établi le ${aujourdhui()}` },
    {
      type: 'resume',
      elements: [
        ['Montant emprunté', formaterEurosCentimes(offre.montant)],
        ['TAEG', formaterTaux(offre.taux)],
        ['Durée', `${offre.duree} mois`],
      ],
    },
    {
      type: 'resume',
      elements: [
        ['Mensualité', formaterEurosCentimes(plan.mensualite)],
        ['Coût du crédit', formaterEurosCentimes(plan.cout)],
        ['Total remboursé', formaterEurosCentimes(plan.total)],
      ],
    },
  ]
  if (ecart) {
    blocs.push({
      type: 'note',
      texte: `La banque a affiché une mensualité de ${formaterEurosCentimes(offre.mensualite)} : ce plan est recalculé avec le montant, le TAEG et la durée ci-dessus. Vérifie ces trois chiffres avec ta banque.`,
    })
  }
  blocs.push(
    { type: 'sousTitre', texte: 'Échéancier mois par mois' },
    {
      type: 'tableau',
      entetes: ['Mois', 'Mensualité', 'Capital', 'Intérêts', 'Reste dû'],
      largeurs: [0.6, 1.2, 1.2, 1, 1.3],
      droite: [1, 2, 3, 4],
      lignes: plan.echeances.map((e) => [
        String(e.mois),
        formaterEurosCentimes(e.mensualite),
        formaterEurosCentimes(e.capital),
        formaterEurosCentimes(e.interets),
        formaterEurosCentimes(e.reste),
      ]),
    },
    {
      type: 'note',
      texte: "Plan indicatif calculé avec le TAEG annoncé (mensualités constantes). L'offre de prêt de la banque fait foi.",
    },
  )
  return blocs
}

function lettreBanquier(p: ProfilCourant): Bloc[] {
  const offre = p.offre
  if (!offre) return EN_ATTENTE
  const mensualite = mensualiteDe(offre)
  const etudes = [p.formation, p.etablissement].filter(Boolean).join(' à ')
  const ressources = [
    p.salaire != null
      ? `Mes ressources mensuelles sont de ${formaterEurosCentimes(p.salaire)}${p.alternant ? " (salaire d'alternance)" : ''}`
      : "Je n'ai pas de salaire à ce jour",
    p.apl ? `, complétées par une APL de ${formaterEurosCentimes(p.apl)} selon le simulateur de la CAF` : '',
    '.',
    p.loyer != null ? ` Mon loyer s'élève à ${formaterEurosCentimes(p.loyer)}, charges comprises.` : '',
    ` Une mensualité de ${formaterEurosCentimes(mensualite)} sur ${offre.duree} mois reste compatible avec mon budget.`,
  ].join('')
  const coordonnees: Bloc[] = [p.adresse, p.email].filter(Boolean).map((t) => ({ type: 'paragraphe', texte: t as string }))
  return [
    { type: 'paragraphe', texte: p.nomComplet, gras: true },
    ...coordonnees,
    { type: 'espace', hauteur: 18 },
    { type: 'paragraphe', texte: `À l'attention du conseiller ${offre.banque}` },
    { type: 'paragraphe', texte: `Le ${aujourdhui()}` },
    { type: 'espace', hauteur: 14 },
    { type: 'paragraphe', texte: 'Objet : demande de prêt étudiant', gras: true },
    { type: 'espace' },
    { type: 'paragraphe', texte: 'Madame, Monsieur,' },
    {
      type: 'paragraphe',
      texte: `${etudes ? `Inscrit(e) en ${etudes}` : 'Étudiant(e)'}${p.alternant ? ' et en alternance' : ''}, je souhaite financer mes études grâce à un prêt étudiant de ${formaterEurosCentimes(offre.montant)}.`,
    },
    { type: 'paragraphe', texte: ressources },
    { type: 'paragraphe', texte: 'Vous trouverez ci-joint les pièces justificatives de mon dossier.' },
    {
      type: 'paragraphe',
      texte:
        'Je reste à votre disposition pour tout échange et vous prie de recevoir, Madame, Monsieur, mes salutations distinguées.',
    },
    { type: 'espace', hauteur: 24 },
    { type: 'paragraphe', texte: p.nomComplet, gras: true },
  ]
}

function checklistPieces(_p: ProfilCourant): Bloc[] {
  return [
    { type: 'titre', texte: 'Checklist des pièces du dossier' },
    { type: 'note', texte: `Prêt étudiant · établie le ${aujourdhui()}` },
    { type: 'espace' },
    {
      type: 'cases',
      elements: [
        [true, "Pièce d'identité"],
        [true, 'Bail (justificatif de domicile)'],
        [true, 'Certificat de scolarité'],
        [true, "Avis d'imposition 2025 des parents"],
        [false, "Contrat d'alternance (à demander à ton employeur si la banque le réclame)"],
        [false, 'RIB (à télécharger depuis ton espace bancaire)'],
      ],
    },
    { type: 'espace' },
    { type: 'note', texte: 'Les pièces cochées sont déjà vérifiées par Passerelle.' },
  ]
}

export const DOCUMENTS_PRETS: DocumentPret[] = [
  {
    id: 'budget',
    titre: 'Budget mensuel',
    description: 'Tes revenus, ton loyer et la mensualité du prêt, pour voir ce qu’il te reste.',
    fichier: 'budget-mensuel.pdf',
    blocs: budgetMensuel,
  },
  {
    id: 'plan',
    titre: 'Plan de remboursement du prêt',
    description: 'Mois par mois, ce que tu rembourses avec la meilleure offre.',
    fichier: 'plan-de-remboursement.pdf',
    blocs: planRemboursement,
  },
  {
    id: 'lettre',
    titre: 'Lettre de présentation au banquier',
    description: 'Une lettre prête à joindre à ta demande, avec ta situation.',
    fichier: 'lettre-au-banquier.pdf',
    blocs: lettreBanquier,
  },
  {
    id: 'checklist',
    titre: 'Checklist des pièces du dossier',
    description: 'Les pièces à fournir, avec celles qui sont déjà vérifiées.',
    fichier: 'checklist-pieces.pdf',
    blocs: checklistPieces,
  },
]

export const NOMS_PIECES_JOINTES = DOCUMENTS_PRETS.map((d) => d.fichier)
