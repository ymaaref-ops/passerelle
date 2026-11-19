'use client'

import { BoutonPrecedent } from '@/components/bouton-precedent'

import { useEffect, useRef, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import {
  DEMARCHES,
  construireRecapMail,
  envoyerMailRecap,
  type DemarcheId,
  type EnvoisParDemarche,
} from '@/lib/validation'
import { NOMS_PIECES_JOINTES } from '@/lib/validation-documents'
import { lireEtat } from '@/lib/n8n'
import { STEP_COLORS } from '@/lib/step-colors'
import { cn } from '@/lib/utils'
import { ConfirmationEnvoi, type StatutMail } from './confirmation-envoi'
import { SectionApl } from './section-apl'
import { SectionDocuments } from './section-documents'
import { SectionPret } from './section-pret'

const COULEUR = STEP_COLORS.orange
const NB_BANQUES = Object.keys(DEMARCHES).length - 1

/** Démarches réellement demandées par l'étudiant (cochées et lancées), lues dans n8n. */
function useDemandees(): { apl: boolean; prets: boolean } | null {
  const [demandees, setDemandees] = useState<{ apl: boolean; prets: boolean } | null>(null)
  useEffect(() => {
    lireEtat()
      .then((etat) => {
        const cochee = (code: string) =>
          (etat.demarches ?? []).some((d) => d.aide_code === code && d.cochee && d.statut !== 'proposee')
        setDemandees({ apl: cochee('apl'), prets: cochee('pret_garanti') })
      })
      .catch(() => setDemandees({ apl: true, prets: false }))
  }, [])
  return demandees
}

export function ValidationPage() {
  const demandees = useDemandees()
  const TOTAL_DEMARCHES = demandees ? (demandees.apl ? 1 : 0) + (demandees.prets ? NB_BANQUES : 0) : 0
  const [envois, setEnvois] = useState<EnvoisParDemarche>({})
  const [statutMail, setStatutMail] = useState<StatutMail>('envoi')
  const dernierMail = useRef(0)
  const confirmation = useRef<HTMLDivElement>(null)

  const nombreEnvoyees = Object.keys(envois).length
  const premierEnvoi = nombreEnvoyees > 0

  // Ramène l'étudiant sur la confirmation quand la première démarche est envoyée.
  useEffect(() => {
    if (!premierEnvoi) return
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    confirmation.current?.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'start' })
  }, [premierEnvoi])

  async function envoyerMail(suivant: EnvoisParDemarche) {
    const numero = ++dernierMail.current
    setStatutMail('envoi')
    try {
      await envoyerMailRecap(construireRecapMail(suivant, NOMS_PIECES_JOINTES))
      if (numero === dernierMail.current) setStatutMail('ok')
    } catch {
      if (numero === dernierMail.current) setStatutMail('erreur')
    }
  }

  function marquerEnvoyee(id: DemarcheId) {
    if (envois[id]) return
    const suivant = { ...envois, [id]: new Date().toISOString() }
    setEnvois(suivant)
    void envoyerMail(suivant)
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 md:py-12">
      <BoutonPrecedent href="/agents" label="Précédent : tes agents" />
      <header className={cn('flex flex-col gap-6 rounded-3xl border p-6 sm:p-8', COULEUR.card)}>
        <div className="max-w-2xl">
          <p className={cn('text-sm font-semibold', COULEUR.text)}>Étape 6 sur 6</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Relis avant d&apos;envoyer
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
            Tout est prêt. Vérifie chaque démarche, puis envoie-la toi-même depuis le site officiel.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border-2 border-step-orange bg-card p-4 sm:items-center">
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full text-white',
              COULEUR.solid,
            )}
          >
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-bold text-foreground">Rien n&apos;est envoyé sans ton clic.</p>
            <p className="text-sm text-muted-foreground">
              Le bouton ouvre le site officiel : tu t&apos;y connectes et c&apos;est toi qui valides.
            </p>
          </div>
        </div>

        <p className="text-sm font-semibold text-foreground" aria-live="polite">
          <span className={COULEUR.text}>{nombreEnvoyees}</span> démarche{nombreEnvoyees > 1 ? 's' : ''} envoyée
          {nombreEnvoyees > 1 ? 's' : ''} sur {TOTAL_DEMARCHES}
        </p>
      </header>

      <div ref={confirmation} className="scroll-mt-24 empty:hidden">
        {premierEnvoi && (
          <ConfirmationEnvoi
            recap={construireRecapMail(envois, NOMS_PIECES_JOINTES)}
            statutMail={statutMail}
            onReessayer={() => void envoyerMail(envois)}
          />
        )}
      </div>

      {demandees === null && <p className="text-muted-foreground">Chargement de tes démarches…</p>}
      {demandees && !demandees.apl && !demandees.prets && (
        <p className="rounded-3xl border border-border bg-card p-6 text-foreground">
          Aucune démarche à relire : coche une aide sur la page Choix pour que nos agents s&apos;en occupent.
        </p>
      )}
      {demandees?.apl && <SectionApl envoyeeLe={envois.apl} onEnvoyer={marquerEnvoyee} />}
      {demandees?.prets && <SectionPret envois={envois} onEnvoyer={marquerEnvoyee} />}
      {demandees?.prets && <SectionDocuments />}
    </div>
  )
}
