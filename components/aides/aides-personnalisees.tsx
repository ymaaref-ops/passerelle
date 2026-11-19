'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { AidesBanner } from '@/components/aides/aides-banner'
import { AidesSelonSituation } from '@/components/aides/aides-selon-situation'
import { lireMonCompte, type MonCompte } from '@/lib/compte'
import { aidesReelles, calculerAge } from '@/lib/eligibilite-reelle'
import { STEP_COLORS } from '@/lib/step-colors'
import { cn } from '@/lib/utils'

/** Aides de l'étudiant connecté, calculées à partir de ses documents. */
export function AidesPersonnalisees() {
  const [compte, setCompte] = useState<MonCompte | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    lireMonCompte()
      .then(setCompte)
      .catch((e) => setErreur(e instanceof Error ? e.message : 'Tes aides ne peuvent pas être chargées.'))
  }, [])

  if (erreur) {
    return (
      <p role="alert" className="font-medium text-danger">
        {erreur}
      </p>
    )
  }
  if (!compte) {
    return (
      <p className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" />
        On calcule tes aides…
      </p>
    )
  }

  const p = compte.profil
  const prenom = p?.prenom || compte.prenom || ''
  const age = p?.date_naissance ? calculerAge(p.date_naissance, new Date()) : null
  const alternant = /altern|apprenti/i.test(`${p?.formation ?? ''} ${p?.situation_pro ?? ''}`)
  const loyer = p?.loyer_hors_charges != null ? Number(p.loyer_hors_charges) + Number(p.charges ?? 0) : null
  const { droit, peutEtre, nonConcerne, totalMensuel, pretMaximum, calculee } = aidesReelles(compte.eligibilite)

  const details = [
    age !== null ? `${age} ans` : null,
    alternant ? 'en alternance' : null,
    loyer ? `avec un loyer de ${loyer} € charges comprises` : null,
  ].filter(Boolean)

  return (
    <>
      <header className="en-tete-page mb-8">
        <p className={cn('inline-flex rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold', STEP_COLORS.violet.text)}>Étape 3 sur 6</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">Tes aides</h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          {prenom ? `Pour ${prenom}` : 'Pour toi'}
          {details.length ? `, ${details.join(', ')}` : ''}. Voici ce qu&apos;on a trouvé à partir de tes documents,
          trié par chances d&apos;y avoir droit.
        </p>
        {!calculee && (
          <p className="mt-2 text-sm text-step-orange">
            Le calcul à partir de tes documents n&apos;est pas encore terminé : ces résultats sont indicatifs.
            Recharge la page dans une minute.
          </p>
        )}
      </header>
      <div className="flex flex-col gap-10">
        <AidesBanner
          prenom={prenom || 'Toi'}
          totalMensuel={totalMensuel}
          pretMaximum={pretMaximum}
          nombreDroits={droit.length}
        />
        <AidesSelonSituation droit={droit} peutEtre={peutEtre} nonConcerne={nonConcerne} />
      </div>
    </>
  )
}
