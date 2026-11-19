import type { Metadata } from 'next'
import { Suspense } from 'react'
import { FenetreAgent } from '@/components/agents/fenetre-agent'

export const metadata: Metadata = {
  title: "Fenêtre de l'agent — Passerelle",
  description: "Ce que fait l'agent, en direct, et ta réponse quand il a besoin de toi.",
}

export default function FenetreAgentPage() {
  return (
    <Suspense fallback={null}>
      <FenetreAgent />
    </Suspense>
  )
}
