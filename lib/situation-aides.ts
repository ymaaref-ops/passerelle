import type { AideEvaluee } from '@/lib/eligibilite'
import type { Situation } from '@/lib/session'

/** Aides liées au fait d'avoir un logement en location. */
const AIDES_LOCATAIRE = ['apl', 'visale', 'loca-pass', 'mobili-jeune']
/** Aides liées au fait de travailler. */
const AIDES_ACTIVITE = ['prime-activite']

export interface AidesParStatut {
  droit: AideEvaluee[]
  peutEtre: AideEvaluee[]
  nonConcerne: AideEvaluee[]
}

/** Range en « non concerné » les aides qui ne correspondent pas à la situation donnée par l'étudiant. */
export function ajusterSelonSituation(aides: AidesParStatut, situation: Situation | null): AidesParStatut {
  if (!situation) return aides
  const exclues = new Set<string>()
  if (situation.logement !== 'locataire') AIDES_LOCATAIRE.forEach((id) => exclues.add(id))
  if (situation.activite === 'aucune') AIDES_ACTIVITE.forEach((id) => exclues.add(id))
  const garder = (e: AideEvaluee) => !exclues.has(e.aide.id)
  const retirees = [...aides.droit, ...aides.peutEtre].filter((e) => !garder(e))
  return {
    droit: aides.droit.filter(garder),
    peutEtre: aides.peutEtre.filter(garder),
    nonConcerne: [
      ...retirees.map((e) => ({
        ...e,
        statut: 'non_concerne' as const,
        raison: AIDES_LOCATAIRE.includes(e.aide.id)
          ? 'Réservée aux étudiants locataires.'
          : 'Réservée aux étudiants qui travaillent.',
      })),
      ...aides.nonConcerne,
    ],
  }
}
