// Questions complémentaires de la spécification d'Ema (« Passerelle_Spec_Ema_Resilience_Supabase_n8n »).
// Bloc 0 : posé à l'étape Situation. Blocs 1 à 4 : posés à l'étape Choix, seulement pour les aides cochées.
// Les réponses partent à n8n (workflow 2) dans `questionnaire_reponses`, avec `email_demarches`.

export type Valeur = string | number | boolean | null
export type Reponses = Record<string, Valeur>

export interface Questionnaire {
  email_demarches: string
  reponses: Reponses
}

/** Ce que l'on sait déjà grâce aux documents et au profil : sert à pré-remplir ou à ne pas reposer une question. */
export interface Contexte {
  /** Champs lus sur tous les documents (OCR), fusionnés. */
  ocr: Record<string, unknown>
  /** Revenus nets des 12 derniers mois donnés à l'étape Situation. */
  ressources: number | null
  etablissement: string | null
}

export const CONTEXTE_VIDE: Contexte = { ocr: {}, ressources: null, etablissement: null }

interface Option {
  valeur: string
  label: string
}

export interface Champ {
  cle: string
  label: string
  aide?: string
  type: 'oui_non' | 'choix' | 'texte' | 'nombre' | 'date'
  options?: Option[]
  /** Valeur proposée d'office (l'étudiant peut la changer). */
  defaut?: Valeur | ((ctx: Contexte, r: Reponses) => Valeur)
  obligatoire?: boolean
  /** Format attendu pour un texte, et le message si ce n'est pas le cas. */
  motif?: { re: RegExp; message: string }
  visible?: (r: Reponses, ctx: Contexte) => boolean
}

export interface Tiroir {
  aide: string
  titre: string
  intro: string
  champs: Champ[]
}

// ——— Bloc 0 (étape Situation) ———

export type TypeLogement = 'prive' | 'crous' | 'parents' | 'cherche'
export type ZoneNationalite = 'fr_ue' | 'hors_ue_boursier' | 'hors_ue_non_boursier'
export type SituationFamiliale = 'celibataire' | 'couple'

export const LOGEMENTS: Option[] = [
  { valeur: 'prive', label: 'Locataire dans le privé' },
  { valeur: 'crous', label: 'En résidence Crous' },
  { valeur: 'parents', label: 'Chez mes parents' },
  { valeur: 'cherche', label: 'Je cherche un logement' },
]

export const ZONES: Option[] = [
  { valeur: 'fr_ue', label: 'Française ou européenne (UE, EEE, Suisse)' },
  { valeur: 'hors_ue_boursier', label: 'Hors UE, boursier ou boursière' },
  { valeur: 'hors_ue_non_boursier', label: 'Hors UE, non boursier' },
]

export const FAMILLE: Option[] = [
  { valeur: 'celibataire', label: 'Célibataire' },
  { valeur: 'couple', label: 'En couple' },
]

// ——— Utilitaires ———

const OUI_NON = (cle: string, label: string, defaut: boolean, extra: Partial<Champ> = {}): Champ => ({
  cle,
  label,
  type: 'oui_non',
  defaut,
  ...extra,
})

/** Vrai si un des champs OCR a une valeur. */
function connu(ctx: Contexte, ...cles: string[]): boolean {
  return cles.some((c) => {
    const v = ctx.ocr[c]
    return v !== null && v !== undefined && String(v).trim() !== ''
  })
}

function texteOcr(ctx: Contexte, ...cles: string[]): string | null {
  for (const c of cles) {
    const v = ctx.ocr[c]
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim()
  }
  return null
}

const prive = (r: Reponses) => r.type_logement === 'prive'

// ——— Blocs 1 à 4 (étape Choix) ———

export const TIROIRS: Tiroir[] = [
  {
    aide: 'bourse-crous',
    titre: 'Bourse du Crous',
    intro: 'Le dossier social étudiant (DSE) demande ces informations en plus de tes documents.',
    champs: [
      OUI_NON('crous_premiere_demande', "C'est ta première demande de bourse ?", true),
      {
        cle: 'crous_ine',
        label: 'Ton numéro INE',
        aide: '11 caractères, sur ton certificat de scolarité ou ton relevé de notes du bac.',
        type: 'texte',
        obligatoire: true,
        motif: { re: /^[0-9A-Za-z]{11}$/, message: "L'INE fait 11 caractères (chiffres et lettres)." },
        visible: (_r, ctx) => !connu(ctx, 'ine', 'numero_ine'),
      },
      {
        cle: 'crous_niveau_etudes',
        label: "Ton niveau d'études l'an prochain",
        type: 'choix',
        options: ['bac1', 'bac2', 'bac3', 'bac4', 'bac5'].map((v) => ({ valeur: v, label: `Bac +${v.slice(3)}` })),
        defaut: 'bac3',
      },
      OUI_NON('crous_redoublement', 'Tu redoubles ?', false),
      {
        cle: 'crous_academie_voeu',
        label: "L'académie de ton établissement",
        aide: 'Par exemple : Paris, Créteil, Lyon.',
        type: 'texte',
        obligatoire: true,
        defaut: (ctx) => texteOcr(ctx, 'academie') ?? '',
      },
      {
        cle: 'crous_fratrie_total',
        label: 'Combien d’enfants tes parents ont-ils à charge, toi compris ?',
        type: 'nombre',
        defaut: 1,
        obligatoire: true,
      },
      {
        cle: 'crous_fratrie_superieur',
        label: 'Parmi eux, combien font des études supérieures (sans te compter) ?',
        type: 'nombre',
        defaut: 0,
        obligatoire: true,
      },
      {
        cle: 'crous_distance_km',
        label: 'Distance entre le domicile de tes parents et ton établissement',
        type: 'choix',
        options: [
          { valeur: '0_29', label: 'Moins de 30 km' },
          { valeur: '30_249', label: '30 à 249 km' },
          { valeur: '250_plus', label: '250 km ou plus' },
        ],
        defaut: '250_plus',
      },
      {
        cle: 'crous_situation_parents',
        label: 'La situation de tes parents',
        type: 'choix',
        options: [
          { valeur: 'maries_ensemble', label: 'Mariés ou en couple' },
          { valeur: 'divorces_separes', label: 'Divorcés ou séparés' },
          { valeur: 'parent_isole', label: 'Un seul parent' },
          { valeur: 'tutelle_autre', label: 'Tutelle ou autre' },
        ],
        obligatoire: true,
      },
      OUI_NON('crous_baisse_revenus', 'Les revenus de tes parents ont-ils beaucoup baissé cette année ?', false),
      OUI_NON('crous_demande_logement', 'Tu veux aussi demander un logement Crous ?', false),
      OUI_NON('crous_mention_tb_bac', 'Tu as eu la mention Très bien au bac (cette année) ?', false),
    ],
  },
  {
    aide: 'apl',
    titre: 'APL (CAF)',
    intro: 'La CAF pose ces questions en plus de ton bail et de tes revenus.',
    champs: [
      OUI_NON('caf_deja_allocataire', 'Tu as déjà un numéro allocataire CAF ?', false),
      {
        cle: 'caf_num_allocataire',
        label: 'Ton numéro allocataire',
        type: 'texte',
        obligatoire: true,
        motif: { re: /^\d{5,8}$/, message: 'Le numéro allocataire fait 7 chiffres en général.' },
        visible: (r) => r.caf_deja_allocataire === true,
      },
      OUI_NON('crous_conventionne', 'Ta résidence Crous est-elle conventionnée APL ?', true, {
        aide: "C'est le cas de presque toutes les résidences Crous.",
        visible: (r) => r.type_logement === 'crous',
      }),
      {
        cle: 'mode_occupation',
        label: 'Tu vis…',
        type: 'choix',
        options: [
          { valeur: 'seul', label: 'Seul ou seule' },
          { valeur: 'couple', label: 'En couple' },
          { valeur: 'colocation', label: 'En colocation' },
        ],
        defaut: 'seul',
        visible: prive,
      },
      {
        cle: 'nb_colocataires',
        label: 'Combien êtes-vous dans la colocation, toi compris ?',
        type: 'nombre',
        obligatoire: true,
        visible: (r) => prive(r) && r.mode_occupation === 'colocation',
      },
      {
        cle: 'part_loyer_cc',
        label: 'Ta part du loyer, charges comprises (en €)',
        type: 'nombre',
        obligatoire: true,
        visible: (r) => prive(r) && r.mode_occupation === 'colocation',
      },
      OUI_NON('lien_parente_bailleur', 'Ton propriétaire fait-il partie de ta famille ?', false, { visible: prive }),
      {
        cle: 'titulaire_bail',
        label: 'Le bail est au nom de…',
        type: 'choix',
        options: [
          { valeur: 'etudiant', label: 'Moi' },
          { valeur: 'parents', label: 'Mes parents' },
        ],
        defaut: 'etudiant',
      },
      {
        cle: 'surface_m2',
        label: 'Surface du logement (en m²)',
        type: 'nombre',
        defaut: 20,
        obligatoire: true,
        visible: (_r, ctx) => !connu(ctx, 'surface_m2', 'surface'),
      },
      OUI_NON('loyer_juillet_n_moins_1', "Tu payais déjà un loyer en juillet de l'an dernier ?", false),
      {
        cle: 'loyer_juillet_montant',
        label: 'Montant de ce loyer (en €)',
        type: 'nombre',
        obligatoire: true,
        visible: (r) => r.loyer_juillet_n_moins_1 === true,
      },
      {
        cle: 'bailleur_type',
        label: 'Ton bailleur est…',
        type: 'choix',
        options: [
          { valeur: 'particulier', label: 'Un particulier' },
          { valeur: 'agence_sci_hlm', label: 'Une agence, une SCI ou un HLM' },
        ],
        obligatoire: true,
        visible: prive,
      },
      {
        cle: 'bailleur_siret',
        label: 'SIRET du bailleur (facultatif)',
        type: 'texte',
        motif: { re: /^\d{14}$/, message: 'Le SIRET fait 14 chiffres.' },
        visible: (r) => prive(r) && r.bailleur_type === 'agence_sci_hlm',
      },
      {
        cle: 'bailleur_adresse_complete',
        label: 'Adresse complète du bailleur',
        type: 'texte',
        obligatoire: true,
        visible: (r, ctx) => prive(r) && !connu(ctx, 'bailleur_adresse', 'adresse_bailleur'),
      },
      OUI_NON('patrimoine_sup_30k', 'As-tu plus de 30 000 € d’épargne ou de patrimoine ?', false),
      {
        cle: 'revenus_12_mois',
        label: 'Tes revenus des 12 derniers mois (en €)',
        aide: 'Repris de l’étape Situation : corrige-le si besoin.',
        type: 'nombre',
        obligatoire: true,
        defaut: (ctx) => ctx.ressources ?? 0,
      },
      {
        cle: 'pension_recue_an',
        label: 'Pension alimentaire reçue sur l’année (en €)',
        type: 'nombre',
        defaut: 0,
        obligatoire: true,
      },
    ],
  },
  {
    aide: 'visale',
    titre: 'Garantie Visale',
    intro: 'Visale se demande avant de signer le bail, pour le logement que tu vises.',
    champs: [
      OUI_NON('visale_caution_autre', 'Une autre personne se porte-t-elle déjà garante pour toi ?', false),
      {
        cle: 'visale_projet_cp_ville',
        label: 'Où cherches-tu ? (code postal et ville)',
        type: 'texte',
        obligatoire: true,
      },
      { cle: 'visale_projet_date', label: "Date d'entrée souhaitée", type: 'date', obligatoire: true },
      {
        cle: 'visale_projet_loyer_max',
        label: 'Loyer maximum, charges comprises (en €)',
        type: 'nombre',
        obligatoire: true,
      },
      {
        cle: 'visale_credits_mensuels',
        label: 'Tes crédits en cours, par mois (en €)',
        type: 'nombre',
        defaut: 0,
        obligatoire: true,
      },
    ],
  },
  {
    aide: 'mobili-jeune',
    titre: 'Mobili-Jeune (Action Logement)',
    intro: 'Pour les alternants : quelques informations sur ton employeur et ton CFA.',
    champs: [
      { cle: 'mj_ancienne_adresse', label: 'Ton adresse avant ce logement', type: 'texte', obligatoire: true },
      OUI_NON('mj_secteur_prive', 'Ton employeur est une entreprise du privé ?', true),
      OUI_NON('mj_deja_percu', 'Tu as déjà touché Mobili-Jeune pour ce contrat ?', false),
      {
        cle: 'mj_siret',
        label: 'SIRET de ton employeur',
        aide: 'Sur ta fiche de paie ou ton contrat (CERFA).',
        type: 'texte',
        obligatoire: true,
        motif: { re: /^\d{14}$/, message: 'Le SIRET fait 14 chiffres.' },
        visible: (_r, ctx) => !connu(ctx, 'siret', 'siret_employeur'),
      },
      {
        cle: 'mj_adresse_travail',
        label: 'Adresse de ton lieu de travail',
        type: 'texte',
        obligatoire: true,
        visible: (_r, ctx) => !connu(ctx, 'adresse_employeur', 'adresse_travail'),
      },
      {
        cle: 'mj_cfa',
        label: 'Nom de ton CFA',
        type: 'texte',
        obligatoire: true,
        visible: (_r, ctx) => !connu(ctx, 'cfa', 'nom_cfa'),
      },
    ],
  },
  {
    aide: 'prime-activite',
    titre: "Prime d'activité (CAF)",
    intro: 'La CAF demande le « montant net social » de tes 3 derniers bulletins de paie.',
    champs: [
      ...[1, 2, 3].map(
        (n): Champ => ({
          cle: `pa_net_social_m${n}`,
          label: n === 1 ? 'Montant net social, dernier mois (en €)' : `Montant net social, il y a ${n} mois (en €)`,
          aide: n === 1 ? 'Il est écrit sur ta fiche de paie, près du net à payer.' : undefined,
          type: 'nombre',
          obligatoire: true,
        }),
      ),
      OUI_NON('pa_hebergement_gratuit', 'Tu es logé ou logée gratuitement ?', false),
      {
        cle: 'pa_autres_allocations',
        label: 'Autres allocations reçues par mois (en €)',
        type: 'nombre',
        defaut: 0,
        obligatoire: true,
      },
    ],
  },
]

export function tiroirDe(aideId: string): Tiroir | undefined {
  return TIROIRS.find((t) => t.aide === aideId)
}

export function champVisible(champ: Champ, r: Reponses, ctx: Contexte): boolean {
  return champ.visible ? champ.visible(r, ctx) : true
}

function valeurDefaut(champ: Champ, ctx: Contexte, r: Reponses): Valeur {
  if (typeof champ.defaut === 'function') return champ.defaut(ctx, r)
  return champ.defaut ?? null
}

function vide(v: Valeur | undefined): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
}

/** Ajoute les valeurs par défaut des questions des aides choisies qui n'ont pas encore de réponse. */
export function completerDefauts(aides: Iterable<string>, r: Reponses, ctx: Contexte): Reponses {
  const suite = { ...r }
  for (const id of aides) {
    for (const champ of tiroirDe(id)?.champs ?? []) {
      if (!(champ.cle in suite)) {
        const d = valeurDefaut(champ, ctx, suite)
        if (!vide(d)) suite[champ.cle] = d
      }
    }
  }
  return suite
}

/** Message d'erreur d'un champ visible, ou null s'il est bon. */
export function erreurChamp(champ: Champ, v: Valeur | undefined): string | null {
  if (vide(v)) return champ.obligatoire ? 'À remplir.' : null
  if (champ.type === 'nombre' && (typeof v !== 'number' || !Number.isFinite(v) || v < 0)) return 'Nombre invalide.'
  if (champ.motif && typeof v === 'string' && !champ.motif.re.test(v.replace(/\s/g, ''))) return champ.motif.message
  return null
}

/** Questions visibles, pour les aides choisies, qui manquent ou sont mal remplies. */
export function champsManquants(aides: Iterable<string>, r: Reponses, ctx: Contexte): { aide: string; champ: Champ }[] {
  const manquants: { aide: string; champ: Champ }[] = []
  for (const id of aides) {
    for (const champ of tiroirDe(id)?.champs ?? []) {
      if (champVisible(champ, r, ctx) && erreurChamp(champ, r[champ.cle])) manquants.push({ aide: id, champ })
    }
  }
  return manquants
}

/** Réponses à envoyer : seulement les questions affichées (pas celles masquées par une autre réponse). */
export function reponsesAEnvoyer(aides: Iterable<string>, r: Reponses, ctx: Contexte): Reponses {
  const choisies = new Set(aides)
  const masquees = new Set<string>()
  for (const t of TIROIRS) {
    for (const champ of t.champs) {
      if (!choisies.has(t.aide) || !champVisible(champ, r, ctx)) masquees.add(champ.cle)
    }
  }
  // Une même clé peut être affichée par une aide et masquée par une autre : on garde si une aide l'affiche.
  for (const id of choisies) {
    for (const champ of tiroirDe(id)?.champs ?? []) if (champVisible(champ, r, ctx)) masquees.delete(champ.cle)
  }
  return Object.fromEntries(
    Object.entries(r)
      .filter(([c, v]) => !masquees.has(c) && !vide(v))
      .map(([c, v]) => [c, typeof v === 'string' && /siret|ine|num_allocataire/.test(c) ? v.replace(/\s/g, '') : v]),
  )
}

/** Fusionne les champs lus sur tous les documents (le plus récent l'emporte). */
export function contexteDepuis(
  documents: { champs_extraits: Record<string, unknown> | null; created_at?: string }[],
  ressources: number | null,
  etablissement: string | null,
): Contexte {
  const ordonnes = [...documents].sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))
  const ocr: Record<string, unknown> = {}
  for (const d of ordonnes) Object.assign(ocr, d.champs_extraits ?? {})
  return { ocr, ressources, etablissement }
}

// ——— Stockage (le temps de la visite ; gardé aussi dans le compte) ———

export const CLE_QUESTIONNAIRE = 'passerelle_questionnaire'

export function lireQuestionnaire(): Questionnaire | null {
  try {
    const brut = window.sessionStorage.getItem(CLE_QUESTIONNAIRE)
    return brut ? (JSON.parse(brut) as Questionnaire) : null
  } catch {
    return null
  }
}

export function enregistrerQuestionnaireLocal(q: Questionnaire): void {
  try {
    window.sessionStorage.setItem(CLE_QUESTIONNAIRE, JSON.stringify(q))
  } catch {
    // Stockage indisponible : rien à faire.
  }
}

export const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
