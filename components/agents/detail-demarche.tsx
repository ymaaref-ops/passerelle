'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, CircleAlert, CircleCheck, Circle, ExternalLink, Loader2 } from 'lucide-react'
import type { AgentId, AgentStatut } from '@/lib/agents'
import { adresseFenetre, ouvrirFenetre } from '@/lib/fenetre'
import { cn } from '@/lib/utils'

type Etat = 'fait' | 'encours' | 'bloque' | 'reste'

interface Etape {
  label: string
  etat: Etat
  note?: string
  lien?: { href: string; texte: string }
}

/** Ce qu'il reste à faire soi-même après l'agent, selon la démarche. */
const DEMANDE_OFFICIELLE: Record<AgentId, string> = {
  apl: 'Faire ta demande d’APL sur caf.fr',
  'prime-activite': 'Faire ta demande de prime d’activité sur caf.fr',
  prets: 'Prendre rendez-vous avec la banque choisie',
  bourse: 'Remplir ton dossier social étudiant (DSE) sur messervices.etudiant.gouv.fr',
  visale: 'Envoyer ta demande Visale',
  'mobili-jeune': 'Envoyer ta demande Mobili-Jeune',
}

function etapesDe(agent: AgentStatut): Etape[] {
  const lance = agent.statut !== 'attente'
  const fini = agent.statut === 'termine' && !agent.interrompu
  return [
    { label: 'Démarche choisie', etat: 'fait' },
    {
      label: `Agent lancé sur ${agent.site}`,
      etat: lance ? 'fait' : 'reste',
      note: lance ? undefined : 'Il démarre dans quelques instants.',
    },
    {
      label: 'Simulateur rempli avec tes informations (documents et questionnaire)',
      etat: agent.interrompu ? 'bloque' : fini ? 'fait' : agent.statut === 'en_cours' ? 'encours' : 'reste',
      note: agent.interrompu
        ? `L'agent s'est arrêté à : « ${agent.resultat} ». Tu pourras finir toi-même, on te guide à la Validation.`
        : agent.statut === 'en_cours'
          ? agent.etape
          : undefined,
    },
    {
      label: 'Résultat obtenu',
      etat: fini ? 'fait' : 'reste',
      note: fini ? agent.resultat : undefined,
    },
    {
      label: 'Relire et valider le résultat',
      etat: agent.envoyee ? 'fait' : 'reste',
      lien: agent.statut === 'termine' && !agent.envoyee ? { href: '/validation', texte: 'Aller à la Validation' } : undefined,
    },
    { label: DEMANDE_OFFICIELLE[agent.id], etat: agent.envoyee ? 'fait' : 'reste' },
  ]
}

const ICONE: Record<Etat, { Icone: typeof Circle; classe: string; texte: string }> = {
  fait: { Icone: CircleCheck, classe: 'text-step-green', texte: 'Fait' },
  encours: { Icone: Loader2, classe: 'text-step-blue motion-safe:animate-spin', texte: 'En cours' },
  bloque: { Icone: CircleAlert, classe: 'text-step-orange', texte: 'À finir' },
  reste: { Icone: Circle, classe: 'text-muted-foreground/60', texte: 'À faire' },
}

function dateLisible(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à ${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`
}

/** Bouton « Voir le détail » : ce que l'agent a fait et ce qu'il reste à faire pour cette démarche. */
export function DetailDemarche({ agent }: { agent: AgentStatut }) {
  const [ouvert, setOuvert] = useState(false)
  const id = useId()
  const etapes = etapesDe(agent)
  const faites = etapes.filter((e) => e.etat === 'fait').length
  const lien = agent.lienDirect

  return (
    <div className="border-t border-foreground/10 pt-4">
      <button
        type="button"
        aria-expanded={ouvert}
        aria-controls={id}
        onClick={() => setOuvert((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-xl text-left text-sm font-semibold text-step-blue outline-none hover:underline focus-visible:ring-4 focus-visible:ring-ring/30"
      >
        <span>
          {ouvert ? 'Masquer le détail' : 'Voir le détail'}
          <span className="ml-2 font-normal text-muted-foreground">
            {faites} étape{faites > 1 ? 's' : ''} faite{faites > 1 ? 's' : ''} sur {etapes.length}
          </span>
        </span>
        <ChevronDown className={cn('size-4 transition-transform', ouvert && 'rotate-180')} aria-hidden="true" />
      </button>

      {ouvert && (
        <div id={id} className="mt-4 flex flex-col gap-4">
          <ol className="flex flex-col gap-3">
            {etapes.map((e) => {
              const { Icone, classe, texte } = ICONE[e.etat]
              return (
                <li key={e.label} className="flex items-start gap-3">
                  <Icone className={cn('mt-0.5 size-5 shrink-0', classe)} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className={cn('text-sm', e.etat === 'reste' ? 'text-muted-foreground' : 'font-semibold text-foreground')}>
                      <span className="sr-only">{texte} : </span>
                      {e.label}
                    </p>
                    {e.note && <p className="mt-0.5 text-sm text-muted-foreground">{e.note}</p>}
                    {e.lien && (
                      <Link href={e.lien.href} className="mt-1 inline-block text-sm font-semibold text-step-blue hover:underline">
                        {e.lien.texte}
                      </Link>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>

          {agent.remarques && (
            <p className="rounded-2xl bg-card/70 p-3 text-sm text-foreground">
              <span className="font-semibold">Remarque du simulateur : </span>
              {agent.remarques}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            {agent.majLe ? <span>Dernière mise à jour : {dateLisible(agent.majLe)}</span> : <span />}
            {lien && (
              <button
                type="button"
                onClick={() => ouvrirFenetre(lien.includes('/share/') ? adresseFenetre('', lien) : lien)}
                className="inline-flex items-center gap-1.5 font-semibold text-step-blue hover:underline"
              >
                Revoir ce que l&apos;agent a fait
                <ExternalLink className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
