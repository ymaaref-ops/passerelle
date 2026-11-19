'use client'

import { Volume2, VolumeX } from 'lucide-react'

/** Bouton pour couper ou remettre le son des jeux. */
export function BoutonSon({ muet, onChange }: { muet: boolean; onChange: (muet: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!muet)}
      aria-pressed={muet}
      aria-label={muet ? 'Remettre le son' : 'Couper le son'}
      title={muet ? 'Remettre le son' : 'Couper le son'}
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-step-blue outline-none hover:bg-step-blue/15 focus-visible:ring-4 focus-visible:ring-ring/30"
    >
      {muet ? <VolumeX className="size-5" aria-hidden="true" /> : <Volume2 className="size-5" aria-hidden="true" />}
    </button>
  )
}
