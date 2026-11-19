'use client'

import { useEffect, useState } from 'react'
import {
  enregistrerProfil,
  enregistrerQuestionnaireCompte,
  enregistrerSituationCompte,
  lireMonCompte,
  sessionCourante,
} from '@/lib/compte'
import {
  EMAIL_VALIDE,
  FAMILLE,
  LOGEMENTS,
  ZONES,
  enregistrerQuestionnaireLocal,
  lireQuestionnaire,
  type SituationFamiliale,
  type TypeLogement,
  type ZoneNationalite,
} from '@/lib/questionnaire'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  enregistrerSituation,
  lireSituation,
  type Activite,
  type Bourse,
  type Logement,
} from '@/lib/session'
import { cn } from '@/lib/utils'

interface Option<T extends string> {
  valeur: T
  label: string
}

const OUI_NON: Option<'oui' | 'non'>[] = [
  { valeur: 'oui', label: 'Oui' },
  { valeur: 'non', label: 'Non' },
]

/** Le logement détaillé (spécification d'Ema) donne la situation utilisée par les autres étapes. */
const VERS_SITUATION: Record<TypeLogement, Logement> = {
  prive: 'locataire',
  crous: 'locataire',
  parents: 'parents',
  cherche: 'cherche',
}
const STATUT: Record<Activite, string> = { alternance: 'alternant', job: 'salarie', aucune: 'etudiant' }

const classeChamp =
  'mt-2 h-12 rounded-xl border border-border bg-background px-4 text-base outline-none focus-visible:ring-4 focus-visible:ring-ring/30'

const ACTIVITE: Option<Activite>[] = [
  { valeur: 'alternance', label: 'Alternance' },
  { valeur: 'job', label: 'Job étudiant' },
  { valeur: 'aucune', label: "Pas d'activité" },
]

const BOURSE: Option<Bourse>[] = [
  { valeur: 'oui', label: 'Oui' },
  { valeur: 'non', label: 'Non' },
  { valeur: 'ne_sais_pas', label: 'Je ne sais pas' },
]

function Question<T extends string>({
  nom,
  titre,
  aide,
  options,
  valeur,
  onChange,
}: {
  nom: string
  titre: string
  aide?: string
  options: Option<T>[]
  valeur: T | ''
  onChange: (v: T) => void
}) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 sm:p-6">
      <legend className="sr-only">{titre}</legend>
      <div>
        <p className="text-lg font-bold text-foreground" aria-hidden="true">
          {titre}
        </p>
        {aide && <p className="text-sm text-muted-foreground">{aide}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.valeur}
            className={cn(
              'flex h-12 cursor-pointer items-center rounded-full border-2 px-5 font-semibold transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring/30',
              valeur === o.valeur
                ? 'border-step-blue bg-step-blue text-white'
                : 'border-border bg-background text-foreground hover:border-step-blue-border',
            )}
          >
            <input
              type="radio"
              name={nom}
              value={o.valeur}
              checked={valeur === o.valeur}
              onChange={() => onChange(o.valeur)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function SituationForm() {
  const router = useRouter()
  const [typeLogement, setTypeLogement] = useState<TypeLogement | ''>('')
  const [bailSigne, setBailSigne] = useState<'oui' | 'non' | ''>('')
  const [zone, setZone] = useState<ZoneNationalite | ''>('')
  const [famille, setFamille] = useState<SituationFamiliale | ''>('')
  const [enfants, setEnfants] = useState('0')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  // Le téléphone n'est demandé que s'il manque dans le profil.
  const [telephoneDemande, setTelephoneDemande] = useState(false)
  const [activite, setActivite] = useState<Activite | ''>('')
  const [bourse, setBourse] = useState<Bourse | ''>('')
  const [ressources, setRessources] = useState('')

  // Reprend les réponses déjà données (retour en arrière).
  useEffect(() => {
    const q = lireQuestionnaire()
    setEmail(q?.email_demarches || sessionCourante()?.email || '')
    const r = q?.reponses ?? {}
    if (typeof r.type_logement === 'string') setTypeLogement(r.type_logement as TypeLogement)
    if (typeof r.bail_signe === 'boolean') setBailSigne(r.bail_signe ? 'oui' : 'non')
    if (typeof r.nationalite_zone === 'string') setZone(r.nationalite_zone as ZoneNationalite)
    if (typeof r.situation_familiale === 'string') setFamille(r.situation_familiale as SituationFamiliale)
    if (typeof r.enfants_a_charge === 'number') setEnfants(String(r.enfants_a_charge))
    const s = lireSituation()
    if (s) {
      if (typeof r.type_logement !== 'string' && s.logement !== 'locataire') setTypeLogement(s.logement)
      setActivite(s.activite)
      setBourse(s.bourse)
      setRessources(String(s.ressources))
    }
    lireMonCompte()
      .then((c) => {
        setTelephoneDemande(!c.profil?.telephone)
        if (!q?.email_demarches && c.questionnaire?.email_demarches) setEmail(c.questionnaire.email_demarches)
      })
      .catch(() => undefined)
  }, [])

  // Sans activité, pas de revenus à saisir.
  const revenusDemandes = activite !== '' && activite !== 'aucune'
  const ressourcesOk = !revenusDemandes || (ressources.trim() !== '' && Number(ressources) >= 0)
  const bailDemande = typeLogement === 'prive' || typeLogement === 'crous'
  const emailOk = EMAIL_VALIDE.test(email.trim())
  // Facultatif : vide, il ne bloque pas ; rempli, il doit ressembler à un numéro.
  const telephoneOk = !telephoneDemande || telephone.trim() === '' || /^[+\d][\d\s.-]{8,}$/.test(telephone.trim())
  const enfantsOk = famille !== '' && Number.isInteger(Number(enfants)) && Number(enfants) >= 0
  const complet =
    typeLogement !== '' &&
    (!bailDemande || bailSigne !== '') &&
    zone !== '' &&
    enfantsOk &&
    emailOk &&
    telephoneOk &&
    activite !== '' &&
    bourse !== '' &&
    ressourcesOk

  function continuer() {
    if (!complet) return
    const situation = {
      logement: VERS_SITUATION[typeLogement as TypeLogement],
      activite: activite as Activite,
      bourse: bourse as Bourse,
      ressources: revenusDemandes ? Number(ressources) : 0,
    }
    enregistrerSituation(situation)
    // Gardée dans le compte : pré-remplie à la prochaine visite.
    void enregistrerSituationCompte(situation).catch(() => undefined)

    // Questions de la spécification d'Ema (bloc 0), gardées avec celles de l'étape Choix.
    const precedent = lireQuestionnaire()
    const questionnaire = {
      email_demarches: email.trim(),
      reponses: {
        ...(precedent?.reponses ?? {}),
        statut: STATUT[activite as Activite],
        type_logement: typeLogement as TypeLogement,
        bail_signe: bailDemande ? bailSigne === 'oui' : false,
        nationalite_zone: zone as ZoneNationalite,
        situation_familiale: famille as SituationFamiliale,
        enfants_a_charge: Number(enfants),
        ...(telephoneDemande && telephone.trim() ? { telephone: telephone.trim() } : {}),
      },
    }
    enregistrerQuestionnaireLocal(questionnaire)
    void enregistrerQuestionnaireCompte(questionnaire).catch(() => undefined)
    if (telephoneDemande && telephone.trim()) void enregistrerProfil({ telephone: telephone.trim() }).catch(() => undefined)
    router.push('/documents')
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 sm:p-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-lg font-bold text-foreground">Ton e-mail pour les démarches</span>
          <span className="text-sm text-muted-foreground">
            Les organismes (CAF, Crous, Action Logement) t&apos;écriront à cette adresse.
          </span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn(classeChamp, 'max-w-md')}
          />
          {email.trim() !== '' && !emailOk && <span className="text-sm text-danger">Cette adresse n&apos;est pas valide.</span>}
        </label>
        {telephoneDemande && (
          <label className="flex flex-col gap-1.5">
            <span className="text-lg font-bold text-foreground">
              Ton numéro de téléphone <span className="font-normal text-muted-foreground">(facultatif)</span>
            </span>
            <span className="text-sm text-muted-foreground">Demandé par la CAF et le Crous : tu pourras l&apos;ajouter plus tard.</span>
            <input
              type="tel"
              autoComplete="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className={cn(classeChamp, 'max-w-xs')}
            />
            {!telephoneOk && <span className="text-sm text-danger">Ce numéro n&apos;est pas valide.</span>}
          </label>
        )}
      </div>

      <Question
        nom="type_logement"
        titre="Ton logement"
        options={LOGEMENTS as Option<TypeLogement>[]}
        valeur={typeLogement}
        onChange={setTypeLogement}
      />
      {bailDemande && (
        <Question
          nom="bail_signe"
          titre="As-tu déjà signé ton bail ?"
          aide="Si oui, la garantie Visale n'est plus possible : elle se demande avant la signature."
          options={OUI_NON}
          valeur={bailSigne}
          onChange={setBailSigne}
        />
      )}
      <Question
        nom="nationalite_zone"
        titre="Ta nationalité"
        options={ZONES as Option<ZoneNationalite>[]}
        valeur={zone}
        onChange={setZone}
      />
      <Question
        nom="situation_familiale"
        titre="Ta situation familiale"
        options={FAMILLE as Option<SituationFamiliale>[]}
        valeur={famille}
        onChange={setFamille}
      />
      {famille !== '' && (
        <label className="flex flex-col gap-1.5 rounded-3xl border border-border bg-card p-5 sm:p-6">
          <span className="text-lg font-bold text-foreground">Nombre d&apos;enfants à ta charge</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={enfants}
            onChange={(e) => setEnfants(e.target.value)}
            className={cn(classeChamp, 'max-w-[8rem]')}
          />
        </label>
      )}
      <Question nom="activite" titre="Ton activité" options={ACTIVITE} valeur={activite} onChange={setActivite} />

      {revenusDemandes && (
        <label className="flex flex-col gap-1.5 rounded-3xl border border-border bg-card p-5 sm:p-6">
          <span className="text-lg font-bold text-foreground">Tes revenus des 12 derniers mois (en €)</span>
          <span className="text-sm text-muted-foreground">
            Le <strong>total sur l&apos;année</strong> de tes salaires nets, pas le montant d&apos;un mois. Par exemple,
            1 100 € par mois pendant 12 mois = 13 200 €. La CAF s&apos;en sert pour l&apos;APL et la prime
            d&apos;activité : le montant change beaucoup le résultat.
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={ressources}
            onChange={(e) => setRessources(e.target.value)}
            className="mt-2 h-12 max-w-xs rounded-xl border border-border bg-background px-4 text-base outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
          />
          {Number(ressources) > 0 && (
            <span className="text-sm text-muted-foreground">
              Soit environ {Math.round(Number(ressources) / 12).toLocaleString('fr-FR')} € par mois.
            </span>
          )}
        </label>
      )}

      <Question
        nom="bourse"
        titre="Es-tu boursier ou boursière cette année ?"
        aide="Bourse sur critères sociaux du Crous."
        options={BOURSE}
        valeur={bourse}
        onChange={setBourse}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={continuer}
          disabled={!complet}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'h-14 gap-2 rounded-2xl px-7 text-base font-semibold disabled:cursor-not-allowed',
          )}
        >
          Continuer
          <ArrowRight className="size-5" aria-hidden="true" />
        </button>
        {!complet && <p className="text-sm text-muted-foreground">Réponds aux questions pour continuer.</p>}
      </div>
    </div>
  )
}
