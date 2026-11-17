import type { Metadata } from 'next'
import { AgentsDashboard } from '@/components/agents/agents-dashboard'

export const metadata: Metadata = {
  title: 'Passerelle travaille pour toi — Passerelle',
  description:
    'Suis en direct tes agents Passerelle : simulation APL et comparaison des prêts étudiants. Ils te préviennent dès qu’ils ont besoin de toi.',
}

export default function AgentsPage() {
  return <AgentsDashboard />
}
