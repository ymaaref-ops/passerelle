'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ChoixForm } from '@/components/choix/choix-form'
import { lireMonCompte } from '@/lib/compte'
import type { AideEvaluee } from '@/lib/eligibilite'
import { aidesReelles } from '@/lib/eligibilite-reelle'

/** Choix des démarches à partir de l'éligibilité calculée sur les documents de l'étudiant. */
export function ChoixReel() {
  const [aides, setAides] = useState<{ droit: AideEvaluee[]; peutEtre: AideEvaluee[] } | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    lireMonCompte()
      .then((c) => {
        const { droit, peutEtre } = aidesReelles(c.eligibilite)
        setAides({ droit, peutEtre })
      })
      .catch((e) => setErreur(e instanceof Error ? e.message : 'Tes aides ne peuvent pas être chargées.'))
  }, [])

  if (erreur) {
    return (
      <p role="alert" className="font-medium text-danger">
        {erreur}
      </p>
    )
  }
  if (!aides) {
    return (
      <p className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" />
        Chargement de tes aides…
      </p>
    )
  }
  return <ChoixForm droit={aides.droit} peutEtre={aides.peutEtre} />
}
