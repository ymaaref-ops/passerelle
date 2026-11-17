'use client'

import { useId, useState } from 'react'
import { Send } from 'lucide-react'
import type { AgentStatut } from '@/lib/agents'
import { cn } from '@/lib/utils'

interface FormulaireAgentProps {
  agent: AgentStatut
  onEnvoyer: (reponse: string) => Promise<void>
}

export function FormulaireAgent({ agent, onEnvoyer }: FormulaireAgentProps) {
  const idChamp = useId()
  const idAide = `${idChamp}-aide`
  const [valeur, setValeur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const demande = agent.demande
  if (!demande) return null

  const estCode = demande.type === 'code'
  const valide = estCode ? /^\d{6}$/.test(valeur) : valeur.trim().length > 0

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    if (!valide || envoi) return
    setEnvoi(true)
    setErreur(null)
    try {
      await onEnvoyer(valeur)
    } catch {
      setErreur("L'envoi a échoué. Réessaie dans un instant.")
      setEnvoi(false)
    }
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-3" data-agent-form={agent.id}>
      <label htmlFor={idChamp} className="text-base font-semibold leading-snug text-foreground">
        {demande.question}
      </label>

      {estCode ? (
        <input
          id={idChamp}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          value={valeur}
          aria-describedby={idAide}
          onChange={(e) => setValeur(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="h-14 w-full rounded-2xl border-2 border-step-orange-border bg-card px-4 text-center text-2xl font-bold tracking-[0.5em] text-foreground outline-none placeholder:text-muted-foreground/40 focus-visible:border-step-orange focus-visible:ring-4 focus-visible:ring-step-orange/20"
        />
      ) : (
        <input
          id={idChamp}
          type={demande.champ === 'date' ? 'date' : 'text'}
          value={valeur}
          aria-describedby={idAide}
          onChange={(e) => setValeur(e.target.value)}
          className="h-14 w-full rounded-2xl border-2 border-step-orange-border bg-card px-4 text-lg text-foreground outline-none focus-visible:border-step-orange focus-visible:ring-4 focus-visible:ring-step-orange/20"
        />
      )}

      <p id={idAide} className="text-sm text-muted-foreground">
        {estCode
          ? 'Le code contient 6 chiffres.'
          : "Ta réponse est transmise uniquement à l'agent concerné."}
      </p>

      {erreur && (
        <p role="alert" className="text-sm font-medium text-danger">
          {erreur}
        </p>
      )}

      <button
        type="submit"
        disabled={!valide || envoi}
        className={cn(
          'inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold outline-none transition-colors focus-visible:ring-4 focus-visible:ring-step-orange/30',
          valide && !envoi
            ? 'bg-step-orange text-white hover:bg-step-orange/90'
            : 'cursor-not-allowed bg-muted text-muted-foreground',
        )}
      >
        <Send className="size-4" aria-hidden="true" />
        {envoi ? 'Envoi…' : estCode ? "Envoyer à l'agent" : 'Répondre'}
      </button>
    </form>
  )
}
