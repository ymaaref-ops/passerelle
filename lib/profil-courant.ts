import { useEffect, useState } from 'react'
import { lireMonCompte, sessionCourante, type MonCompte } from '@/lib/compte'
import { lireEtat } from '@/lib/n8n'
import { MONTANT_PAR_DEFAUT } from '@/lib/choix'

/** Informations réelles de l'étudiant connecté, utilisées à l'étape Validation et dans les documents générés. */
export interface ProfilCourant {
  prenom: string
  nomComplet: string
  email: string
  adresse: string | null
  typeLogement: string | null
  /** Loyer charges comprises, en euros par mois. */
  loyer: number | null
  /** Salaire net mensuel lu sur la fiche de paie, sinon revenus des 12 mois / 12. */
  salaire: number | null
  ressources12Mois: number | null
  formation: string | null
  etablissement: string | null
  alternant: boolean
  /** APL donnée par le simulateur CAF (null si pas encore de résultat). */
  apl: number | null
  /** Offre de prêt la moins chère trouvée par le comparateur (null si pas encore de résultat). */
  offre: OffreReelle | null
}

export interface OffreReelle {
  banque: string
  /** TAEG annoncé par la banque, en %. */
  taux: number
  duree: number
  mensualite: number
  montant: number
  /** Total remboursé. */
  coutTotal: number
  /** Coût du crédit (intérêts et frais). */
  interets: number
}

const DUREE_PRET = 60

/** Meilleure offre (coût total le plus bas) dans la réponse de l'agent « comparateur-pret ». */
function meilleureOffre(resultatAgent: unknown, montantParDefaut: number): OffreReelle | null {
  const reponse = ((resultatAgent ?? {}) as Record<string, any>).reponse ?? {}
  const lignes: Record<string, unknown>[] = Array.isArray(reponse.resultats) ? reponse.resultats : []
  let meilleure: OffreReelle | null = null
  for (const l of lignes) {
    const mensualite = nombre(l.mensualite)
    if (l.statut === 'echec' || mensualite === null) continue
    const cout = nombre(l.cout_total_credit)
    const du = nombre(l.montant_total_du)
    const montant = du !== null && cout !== null ? Math.round(du - cout) : montantParDefaut
    const interets = cout ?? Math.max(0, mensualite * DUREE_PRET - montant)
    const offre: OffreReelle = {
      banque: String(l.banque ?? 'Banque'),
      taux: nombre(l.taeg) ?? 0,
      duree: DUREE_PRET,
      mensualite,
      montant,
      coutTotal: du ?? montant + interets,
      interets,
    }
    if (!meilleure || offre.interets < meilleure.interets) meilleure = offre
  }
  return meilleure
}

function nombre(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function construireProfil(compte: MonCompte, apl: number | null, offre: OffreReelle | null = null): ProfilCourant {
  const p = compte.profil
  const paie = compte.documents.find((d) => d.type === 'fiche_paie')?.champs_extraits ?? {}
  const prenom = p?.prenom || compte.prenom || ''
  const ressources = nombre(p?.ressources_12_mois)
  const net = nombre((paie as Record<string, unknown>).net_a_payer)
  const loyerHc = nombre(p?.loyer_hors_charges)
  return {
    prenom,
    nomComplet: [prenom, p?.nom].filter(Boolean).join(' '),
    email: compte.email ?? '',
    adresse: p?.adresse_logement ?? null,
    typeLogement: p?.type_logement ?? null,
    loyer: loyerHc === null ? null : loyerHc + (nombre(p?.charges) ?? 0),
    salaire: net ?? (ressources ? Math.round(ressources / 12) : null),
    ressources12Mois: ressources,
    formation: p?.formation ?? null,
    etablissement: p?.etablissement ?? null,
    alternant: /altern|apprenti/i.test(`${p?.formation ?? ''} ${p?.situation_pro ?? ''}`),
    apl,
    offre,
  }
}

let cache: Promise<ProfilCourant> | null = null

/** Profil réel (une seule lecture par page). */
export function useProfilCourant(): ProfilCourant | null {
  const [profil, setProfil] = useState<ProfilCourant | null>(null)
  useEffect(() => {
    if (!cache) {
      cache = Promise.all([
        lireMonCompte(),
        lireEtat()
          .then((etat) => {
            const v = etat.demarches?.find((d) => d.aide_code === 'apl')?.montant_estime
            const pret = etat.demarches?.find((d) => d.aide_code === 'pret_garanti')
            return {
              apl: v === null || v === undefined || v === '' ? null : Math.round(Number(v)),
              offre: pret ? meilleureOffre(pret.resultat_agent, MONTANT_PAR_DEFAUT) : null,
            }
          })
          .catch(() => ({ apl: null, offre: null })),
      ]).then(([compte, etat]) => construireProfil(compte, etat.apl, etat.offre))
      cache.catch(() => {
        cache = null
      })
    }
    let actif = true
    cache
      .then((p) => {
        if (actif) setProfil(p)
      })
      .catch(() => {
        const s = sessionCourante()
        if (actif)
          setProfil({
            prenom: s?.prenom ?? '',
            nomComplet: s?.prenom ?? '',
            email: s?.email ?? '',
            adresse: null,
            typeLogement: null,
            loyer: null,
            salaire: null,
            ressources12Mois: null,
            formation: null,
            etablissement: null,
            alternant: false,
            apl: null,
            offre: null,
          })
      })
    return () => {
      actif = false
    }
  }, [])
  return profil
}
