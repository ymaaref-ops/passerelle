'use client'

import type { ReactNode } from 'react'
import { useSession } from '@/components/compte/menu-compte'
import { TableauDeBord } from '@/components/home/tableau-de-bord'

/** Page d'accueil : tableau de bord si l'étudiant est connecté, présentation de Passerelle sinon. */
export function Accueil({ presentation }: { presentation: ReactNode }) {
  const session = useSession()
  if (session === undefined) return null
  return session ? <TableauDeBord /> : <>{presentation}</>
}
