import { aides, calculerAge } from '@/lib/data'
import { type AideEvaluee, type AidesTriees, type StatutEligibilite } from '@/lib/eligibilite'
import type { EligibiliteReelle } from '@/lib/compte'

/** Code de l'aide dans Supabase → aides de l'interface concernées. */
const CODE_VERS_UI: Record<string, string[]> = {
  apl: ['apl'],
  prime_activite: ['prime-activite'],
  pret_garanti: ['pret-etat', 'pret-lbp', 'pret-sg', 'pret-cic'],
  bourse_crous: ['bourse-crous'],
  visale: ['visale'],
  mobili_jeune: ['mobili-jeune'],
  loca_pass: ['loca-pass'],
  mobilite_master: ['aide-mobilite'],
  aide_urgence: ['aide-urgence-crous'],
}

const STATUTS: Record<EligibiliteReelle['eligibilite'], StatutEligibilite> = {
  eligible: 'droit',
  peut_etre: 'peut_etre',
  non_concerne: 'non_concerne',
}

const PRETS = new Set(CODE_VERS_UI.pret_garanti)

/**
 * Éligibilité calculée après la lecture des documents (workflow 1).
 * Les aides sans résultat (pas encore calculées) restent « peut-être », sans montant.
 */
export function aidesReelles(reelle: EligibiliteReelle[]): AidesTriees & { calculee: boolean } {
  if (reelle.length === 0) {
    const enAttente: AideEvaluee[] = aides.map((aide) => ({
      aide,
      statut: 'peut_etre',
      raison: 'Calcul en cours à partir de tes documents.',
      mensuelMax: 0,
      pretMax: 0,
    }))
    return { droit: [], peutEtre: enAttente, nonConcerne: [], totalMensuel: 0, pretMaximum: 0, calculee: false }
  }
  // Le plus récent par aide (la liste arrive triée du plus récent au plus ancien).
  const parAideUi = new Map<string, EligibiliteReelle>()
  for (const r of reelle) {
    for (const id of CODE_VERS_UI[r.aide_code] ?? []) if (!parAideUi.has(id)) parAideUi.set(id, r)
  }
  const evaluees: AideEvaluee[] = aides.map((aide) => {
    const r = parAideUi.get(aide.id)
    if (!r) {
      return {
        aide,
        statut: 'peut_etre',
        raison: 'À vérifier sur le site officiel : Passerelle ne peut pas encore le calculer.',
        mensuelMax: 0,
        pretMax: 0,
      }
    }
    const statut = STATUTS[r.eligibilite] ?? 'peut_etre'
    const montant = r.montant_estime == null ? 0 : Number(r.montant_estime) || 0
    return {
      aide,
      statut,
      raison: statut === 'droit' ? null : r.raison_eligibilite,
      mensuelMax: 0,
      pretMax: PRETS.has(aide.id) && statut === 'droit' ? montant : 0,
    }
  })
  const droit = evaluees.filter((a) => a.statut === 'droit')
  return {
    droit,
    peutEtre: evaluees.filter((a) => a.statut === 'peut_etre'),
    nonConcerne: evaluees.filter((a) => a.statut === 'non_concerne'),
    totalMensuel: 0,
    pretMaximum: droit.reduce((max, a) => Math.max(max, a.pretMax), 0),
    calculee: true,
  }
}

export { calculerAge }
