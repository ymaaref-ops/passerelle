'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Bot, GraduationCap, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BoutonSon } from '@/components/bouton-son'
import { changerMuet, estMuet, jouerSon } from '@/lib/sons'

/**
 * Morpion (X / O) contre le robot, aux couleurs des études :
 * tu joues avec la toque de diplômé, le robot avec le livre.
 * Le robot gagne s'il peut, te bloque s'il voit ta victoire, sinon joue au mieux… avec parfois une étourderie.
 */

type Joueur = 'toi' | 'robot'
type Case = Joueur | null

const LIGNES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

function gagnant(g: Case[]): { joueur: Joueur; ligne: number[] } | null {
  for (const l of LIGNES) {
    const [a, b, c] = l
    if (g[a] && g[a] === g[b] && g[a] === g[c]) return { joueur: g[a] as Joueur, ligne: l }
  }
  return null
}

function coupGagnant(g: Case[], j: Joueur): number | null {
  for (const [a, b, c] of LIGNES) {
    const trio = [g[a], g[b], g[c]]
    if (trio.filter((v) => v === j).length === 2 && trio.includes(null)) return [a, b, c][trio.indexOf(null)]
  }
  return null
}

function coupRobot(g: Case[]): number {
  const libres = g.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0)
  // Une étourderie de temps en temps : le robot reste battable.
  if (Math.random() < 0.2) return libres[Math.floor(Math.random() * libres.length)]
  const gagner = coupGagnant(g, 'robot')
  if (gagner !== null) return gagner
  const bloquer = coupGagnant(g, 'toi')
  if (bloquer !== null) return bloquer
  if (!g[4]) return 4
  const coins = [0, 2, 6, 8].filter((i) => !g[i])
  if (coins.length) return coins[Math.floor(Math.random() * coins.length)]
  return libres[Math.floor(Math.random() * libres.length)]
}

function Pion({ joueur, className }: { joueur: Joueur; className?: string }) {
  return joueur === 'toi' ? (
    <GraduationCap className={cn('text-primary', className)} aria-hidden="true" />
  ) : (
    <BookOpen className={cn('text-step-orange', className)} aria-hidden="true" />
  )
}

export function MorpionEtudes({
  titre = 'En attendant, un morpion contre le robot ?',
  note,
}: {
  titre?: string
  note?: string
}) {
  const [grille, setGrille] = useState<Case[]>(Array(9).fill(null))
  const [premier, setPremier] = useState<Joueur>('toi')
  const [tour, setTour] = useState<Joueur>('toi')
  const [scores, setScores] = useState({ toi: 0, robot: 0, nul: 0 })
  const [muet, setMuet] = useState(false)
  useEffect(() => setMuet(estMuet()), [])

  const fin = gagnant(grille)
  const pleine = grille.every(Boolean)
  const terminee = Boolean(fin) || pleine

  // Le robot joue après un court temps de réflexion.
  useEffect(() => {
    if (tour !== 'robot' || terminee) return
    const id = window.setTimeout(() => {
      setGrille((g) => {
        const suite = [...g]
        suite[coupRobot(g)] = 'robot'
        return suite
      })
      jouerSon('robot', muet)
      setTour('toi')
    }, 550)
    return () => window.clearTimeout(id)
  }, [tour, terminee, muet])

  // Compte des points à la fin de chaque partie.
  useEffect(() => {
    if (!terminee) return
    setScores((s) => (fin ? { ...s, [fin.joueur]: s[fin.joueur] + 1 } : { ...s, nul: s.nul + 1 }))
    // Petit délai : le son de fin arrive après celui du dernier pion.
    window.setTimeout(() => jouerSon(fin ? (fin.joueur === 'toi' ? 'victoire' : 'defaite') : 'nul', muet), 150)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminee])

  function jouer(i: number) {
    if (grille[i] || tour !== 'toi' || terminee) return
    const suite = [...grille]
    suite[i] = 'toi'
    jouerSon('pose', muet)
    setGrille(suite)
    setTour('robot')
  }

  function rejouer() {
    // Chacun commence à son tour.
    const prochain: Joueur = premier === 'toi' ? 'robot' : 'toi'
    setPremier(prochain)
    setGrille(Array(9).fill(null))
    setTour(prochain)
  }

  const message = fin
    ? fin.joueur === 'toi'
      ? 'Bravo, diplôme en poche ! 🎓'
      : 'Le robot a révisé plus que toi…'
    : pleine
      ? 'Match nul : ex æquo !'
      : tour === 'toi'
        ? 'À toi de jouer'
        : 'Le robot réfléchit…'

  return (
    <section aria-labelledby="titre-morpion" className="rounded-3xl bg-card p-5 shadow-carte sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex flex-col gap-3 sm:max-w-xs">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-step-blue">
              <Bot className="size-5" aria-hidden="true" />
            </span>
            <h2 id="titre-morpion" className="flex-1 text-lg font-bold text-foreground">
              {titre}
            </h2>
            <BoutonSon
              muet={muet}
              onChange={(m) => {
                setMuet(m)
                changerMuet(m)
              }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Aligne 3 toques de diplômé avant que le robot aligne 3 livres.
          </p>
          <div className="flex gap-2 text-sm font-semibold tabular-nums">
            <span className="flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-foreground">
              <Pion joueur="toi" className="size-4" /> Toi {scores.toi}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-step-orange-soft px-3 py-1.5 text-foreground">
              <Pion joueur="robot" className="size-4" /> Robot {scores.robot}
            </span>
            <span className="flex items-center rounded-full bg-muted px-3 py-1.5 text-muted-foreground">Nul {scores.nul}</span>
          </div>
          <p aria-live="polite" className="font-bold text-foreground">
            {message}
          </p>
          {terminee && (
            <button
              type="button"
              onClick={rejouer}
              className="inline-flex h-11 w-fit items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Rejouer
            </button>
          )}
        </div>

        <div role="grid" aria-label="Grille du morpion" className="grid w-full max-w-[18rem] grid-cols-3 gap-2 self-center">
          {grille.map((v, i) => {
            const gagnante = fin?.ligne.includes(i)
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                onClick={() => jouer(i)}
                disabled={Boolean(v) || tour !== 'toi' || terminee}
                aria-label={`Case ${i + 1} : ${v === 'toi' ? 'ta toque' : v === 'robot' ? 'livre du robot' : 'vide'}`}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-2xl outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ring/30',
                  gagnante ? (fin?.joueur === 'toi' ? 'bg-success-soft' : 'bg-step-orange-soft') : 'bg-primary-soft',
                  !v && tour === 'toi' && !terminee && 'cursor-pointer hover:bg-step-blue/15',
                )}
              >
                {v && <Pion joueur={v} className="size-10 motion-safe:animate-in motion-safe:zoom-in-50" />}
              </button>
            )
          })}
        </div>
      </div>
      {note && <p className="mt-4 text-sm text-muted-foreground">{note}</p>}
    </section>
  )
}
