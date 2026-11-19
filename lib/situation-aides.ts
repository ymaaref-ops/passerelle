import type { AideEvaluee } from '@/lib/eligibilite'
import type { Reponses } from '@/lib/questionnaire'
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

/**
 * Range en « non concerné » les aides qui ne correspondent pas à la situation donnée par l'étudiant,
 * et, s'il a répondu aux questions complémentaires, aux règles de la spécification d'Ema.
 */
export function ajusterSelonSituation(
  aides: AidesParStatut,
  situation: Situation | null,
  reponses: Reponses | null = null,
): AidesParStatut {
  if (!situation) return aides
  const exclues = new Map<string, string>()
  const exclure = (id: string, raison: string) => {
    if (!exclues.has(id)) exclues.set(id, raison)
  }

  if (situation.logement === 'parents') AIDES_LOCATAIRE.forEach((id) => exclure(id, 'Réservée aux étudiants locataires.'))
  if (situation.logement === 'cherche') {
    // Sans logement, on garde Visale : elle se demande justement avant de signer le bail.
    exclure('apl', 'Se demande une fois le logement trouvé.')
    exclure('loca-pass', 'Se demande une fois le logement trouvé.')
    exclure('mobili-jeune', 'Se demande une fois le logement trouvé.')
  }
  if (situation.activite === 'aucune') AIDES_ACTIVITE.forEach((id) => exclure(id, 'Réservée aux étudiants qui travaillent.'))
  if (situation.activite !== 'alternance') exclure('mobili-jeune', 'Réservée aux alternants.')

  if (reponses) {
    if (reponses.nationalite_zone === 'hors_ue_non_boursier') {
      exclure('apl', "Hors UE, l'APL est réservée aux boursiers depuis le 1er juillet 2026.")
    }
    if (reponses.bail_signe === true) exclure('visale', 'Visale se demande avant de signer le bail.')
  }
  // La spécification exclut Loca-Pass des démarches lancées par Passerelle.
  exclure('loca-pass', 'Passerelle ne fait pas encore cette démarche.')

  const garder = (e: AideEvaluee) => !exclues.has(e.aide.id)
  const retirees = [...aides.droit, ...aides.peutEtre].filter((e) => !garder(e))
  return {
    droit: aides.droit.filter(garder),
    peutEtre: aides.peutEtre.filter(garder),
    nonConcerne: [
      ...retirees.map((e) => ({
        ...e,
        statut: 'non_concerne' as const,
        raison: exclues.get(e.aide.id) as string,
      })),
      ...aides.nonConcerne,
    ],
  }
}
