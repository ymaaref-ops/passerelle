'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Gamepad2, RotateCcw, Trophy } from 'lucide-react'
import { BoutonSon } from '@/components/bouton-son'
import { changerMuet, estMuet, jouerSon } from '@/lib/sons'

/**
 * Petit jeu pendant l'attente des agents, façon « dinosaure de Chrome » :
 * le bonhomme de Passerelle court sur le campus et saute par-dessus les tables, piles de livres, chaises,
 * réveils et dossiers. Les pièces € (tes aides) et les diplômes donnent des points bonus ;
 * les avions en papier passent en hauteur : ne saute pas à ce moment-là.
 */

const H = 220
const SOL = H - 34
const X_PERSO = 70
const GRAVITE = 0.62
const SAUT = -11.6
const CLE_RECORD = 'passerelle_jeu_record'

const C = {
  nuit: '#1e1b6b',
  indigo: '#4f46e5',
  lavande: '#ecebfb',
  lavandeFonce: '#d9d6f5',
  orange: '#e0782f',
  vert: '#2f9e6e',
  bois: '#b9814f',
  boisFonce: '#8a5a33',
  peau: '#f2c9a0',
  papier: '#ffffff',
  gris: '#9b98c4',
  or: '#f2b630',
}

type TypeObstacle = 'table' | 'livres' | 'chaise' | 'reveil' | 'dossier' | 'ordinateur' | 'avion'
type TypeBonus = 'euro' | 'diplome'

interface Obstacle {
  type: TypeObstacle
  x: number
  y: number
  l: number
  h: number
}

interface Bonus {
  type: TypeBonus
  x: number
  y: number
  pris: boolean
}

interface Message {
  texte: string
  x: number
  y: number
  vie: number
}

const DIMENSIONS: Record<Exclude<TypeObstacle, 'avion'>, { l: number; h: number }> = {
  table: { l: 58, h: 34 },
  livres: { l: 30, h: 42 },
  chaise: { l: 30, h: 46 },
  reveil: { l: 28, h: 30 },
  dossier: { l: 36, h: 30 },
  ordinateur: { l: 42, h: 28 },
}
const AU_SOL = Object.keys(DIMENSIONS) as Exclude<TypeObstacle, 'avion'>[]

function arrondi(ctx: CanvasRenderingContext2D, x: number, y: number, l: number, h: number, r: number) {
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, l, h, r)
  else ctx.rect(x, y, l, h)
}

// ——— Dessins ———

function dessinerPerso(ctx: CanvasRenderingContext2D, x: number, yPieds: number, t: number, enLair: boolean, perdu: boolean) {
  ctx.save()
  ctx.translate(x, yPieds - 48)
  // Ombre (reste au sol)
  ctx.fillStyle = 'rgba(30,27,107,0.15)'
  ctx.beginPath()
  ctx.ellipse(20, 46 + (SOL - yPieds), 9, 1.8, 0, 0, Math.PI * 2)
  ctx.fill()

  const balance = enLair || perdu ? 0 : Math.sin(t / 3.2) * 0.55
  const jambe = (dx: number, angle: number) => {
    ctx.save()
    ctx.translate(dx, 30)
    ctx.rotate(angle)
    ctx.strokeStyle = C.nuit
    ctx.lineWidth = 3.4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, enLair ? 10 : 13)
    ctx.stroke()
    ctx.restore()
  }
  jambe(18, enLair ? -0.6 : balance)
  jambe(22, enLair ? 0.5 : -balance)
  // Sac à dos
  ctx.fillStyle = C.orange
  arrondi(ctx, 9.5, 17, 7, 11, 2.5)
  ctx.fill()
  // Corps
  ctx.fillStyle = C.indigo
  arrondi(ctx, 14, 16, 12, 16, 5)
  ctx.fill()
  // Bras
  ctx.save()
  ctx.translate(21, 19)
  ctx.rotate(enLair ? -2.2 : -balance)
  ctx.strokeStyle = C.nuit
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, 9)
  ctx.stroke()
  ctx.restore()
  // Tête, cheveux, visage
  ctx.fillStyle = C.peau
  ctx.beginPath()
  ctx.arc(21, 9.5, 6.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = C.nuit
  ctx.beginPath()
  ctx.arc(21, 8.6, 6.6, Math.PI * 1.05, Math.PI * 1.95)
  ctx.fill()
  if (perdu) {
    ctx.strokeStyle = C.nuit
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(23, 8.6)
    ctx.lineTo(25, 10.6)
    ctx.moveTo(25, 8.6)
    ctx.lineTo(23, 10.6)
    ctx.stroke()
  } else {
    ctx.fillStyle = C.nuit
    ctx.beginPath()
    ctx.arc(24, 9.8, 0.95, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = C.nuit
    ctx.lineWidth = 0.9
    ctx.beginPath()
    ctx.moveTo(22.6, 12.4)
    ctx.quadraticCurveTo(24.2, 13.6, 25.6, 12.4)
    ctx.stroke()
  }
  ctx.restore()
}

function dessinerObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, t: number) {
  const { x, y, l, h } = o
  ctx.save()
  switch (o.type) {
    case 'table': {
      ctx.fillStyle = C.bois
      arrondi(ctx, x, y, l, 7, 2)
      ctx.fill()
      ctx.fillStyle = C.boisFonce
      ctx.fillRect(x + 4, y + 7, 4, h - 7)
      ctx.fillRect(x + l - 8, y + 7, 4, h - 7)
      // Une lampe et un cahier posés dessus
      ctx.fillStyle = C.papier
      ctx.fillRect(x + 10, y - 3, 14, 3)
      ctx.fillStyle = C.indigo
      ctx.fillRect(x + l - 18, y - 12, 3, 12)
      ctx.fillStyle = C.or
      ctx.beginPath()
      ctx.moveTo(x + l - 22, y - 12)
      ctx.lineTo(x + l - 10, y - 12)
      ctx.lineTo(x + l - 13, y - 18)
      ctx.lineTo(x + l - 19, y - 18)
      ctx.fill()
      break
    }
    case 'livres': {
      const couleurs = [C.indigo, C.orange, C.vert, C.nuit, '#c2410c']
      const n = 5
      const ep = h / n
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = couleurs[i % couleurs.length]
        const decal = i % 2 === 0 ? 0 : 3
        arrondi(ctx, x + decal, y + h - (i + 1) * ep, l - 3, ep - 1, 1.5)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.fillRect(x + decal + 4, y + h - (i + 1) * ep + ep / 2 - 1, l - 12, 1.5)
      }
      break
    }
    case 'chaise': {
      ctx.fillStyle = C.indigo
      arrondi(ctx, x + l - 7, y, 6, h - 14, 2)
      ctx.fill()
      arrondi(ctx, x, y + h - 20, l, 6, 2)
      ctx.fill()
      ctx.fillStyle = C.nuit
      ctx.fillRect(x + 2, y + h - 14, 3, 14)
      ctx.fillRect(x + l - 6, y + h - 14, 3, 14)
      break
    }
    case 'reveil': {
      const cx = x + l / 2
      const cy = y + h / 2 + 2
      ctx.fillStyle = C.orange
      ctx.beginPath()
      ctx.arc(cx - 8, y + 4, 5, 0, Math.PI * 2)
      ctx.arc(cx + 8, y + 4, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#e11d48'
      ctx.beginPath()
      ctx.arc(cx, cy, l / 2 - 1, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = C.papier
      ctx.beginPath()
      ctx.arc(cx, cy, l / 2 - 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = C.nuit
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx, cy - 6)
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(t / 6) * 5, cy + Math.sin(t / 6) * 5)
      ctx.stroke()
      break
    }
    case 'dossier': {
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i === 3 ? '#f6d365' : C.papier
        ctx.strokeStyle = C.gris
        ctx.lineWidth = 1
        arrondi(ctx, x + (i % 2) * 2, y + h - (i + 1) * 7.5, l - 2, 7, 1)
        ctx.fill()
        ctx.stroke()
      }
      ctx.fillStyle = C.nuit
      ctx.font = 'bold 8px system-ui, sans-serif'
      ctx.fillText('CAF', x + 9, y + 7)
      break
    }
    case 'ordinateur': {
      ctx.fillStyle = C.nuit
      arrondi(ctx, x + 5, y, l - 10, h - 6, 3)
      ctx.fill()
      ctx.fillStyle = '#a5b4fc'
      ctx.fillRect(x + 8, y + 3, l - 16, h - 12)
      ctx.fillStyle = C.gris
      arrondi(ctx, x, y + h - 6, l, 6, 2)
      ctx.fill()
      break
    }
    case 'avion': {
      ctx.translate(x, y + Math.sin(t / 8) * 2)
      ctx.fillStyle = C.papier
      ctx.strokeStyle = C.gris
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(0, h / 2)
      ctx.lineTo(l, 0)
      ctx.lineTo(l * 0.7, h)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, h / 2)
      ctx.lineTo(l * 0.62, h * 0.62)
      ctx.lineTo(l * 0.7, h)
      ctx.stroke()
      break
    }
  }
  ctx.restore()
}

function dessinerBonus(ctx: CanvasRenderingContext2D, b: Bonus, t: number) {
  const y = b.y + Math.sin(t / 10 + b.x / 50) * 3
  ctx.save()
  if (b.type === 'euro') {
    ctx.fillStyle = C.or
    ctx.beginPath()
    ctx.arc(b.x, y, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#c98a12'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#7a4d00'
    ctx.font = 'bold 13px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('€', b.x, y + 1)
  } else {
    // Diplôme roulé avec un ruban
    ctx.fillStyle = C.papier
    ctx.strokeStyle = C.gris
    arrondi(ctx, b.x - 13, y - 5, 26, 10, 5)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#e11d48'
    ctx.fillRect(b.x - 2, y - 5, 4, 10)
    ctx.beginPath()
    ctx.moveTo(b.x - 2, y + 5)
    ctx.lineTo(b.x - 5, y + 11)
    ctx.lineTo(b.x, y + 8)
    ctx.lineTo(b.x + 5, y + 11)
    ctx.lineTo(b.x + 2, y + 5)
    ctx.fill()
  }
  ctx.restore()
}

function dessinerDecor(ctx: CanvasRenderingContext2D, largeur: number, decalage: number) {
  // Ciel lavande
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#f6f5fe')
  g.addColorStop(1, C.lavande)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, largeur, H)
  // Bâtiments du campus au loin (défilent lentement)
  const pas = 170
  const d1 = (decalage * 0.2) % pas
  for (let x = -d1 - pas; x < largeur + pas; x += pas) {
    ctx.fillStyle = C.lavandeFonce
    ctx.fillRect(x, SOL - 70, 70, 70)
    ctx.fillRect(x + 80, SOL - 45, 55, 45)
    ctx.fillStyle = '#c9c5ef'
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) ctx.fillRect(x + 9 + c * 20, SOL - 62 + r * 15, 10, 8)
  }
  // Nuages
  const d2 = (decalage * 0.08) % 260
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  for (let x = -d2; x < largeur + 260; x += 260) {
    ctx.beginPath()
    ctx.arc(x + 40, 40, 13, 0, Math.PI * 2)
    ctx.arc(x + 58, 34, 17, 0, Math.PI * 2)
    ctx.arc(x + 78, 41, 12, 0, Math.PI * 2)
    ctx.fill()
  }
  // Sol
  ctx.fillStyle = C.nuit
  ctx.fillRect(0, SOL, largeur, 2)
  ctx.fillStyle = C.gris
  const d3 = decalage % 40
  for (let x = -d3; x < largeur; x += 40) ctx.fillRect(x, SOL + 9, 14, 2)
  for (let x = -((decalage * 1.0 + 20) % 67); x < largeur; x += 67) ctx.fillRect(x, SOL + 18, 6, 2)
}

// ——— Composant ———

type Etat = 'pret' | 'joue' | 'perdu'

export function JeuAttente({
  titre = 'En attendant, joue un peu !',
  note = "Tes agents continuent pendant que tu joues : tu seras prévenu dès qu'ils ont besoin de toi.",
}: {
  titre?: string
  note?: string
}) {
  const toile = useRef<HTMLCanvasElement>(null)
  const boite = useRef<HTMLDivElement>(null)
  const [etat, setEtat] = useState<Etat>('pret')
  const [score, setScore] = useState(0)
  const [record, setRecord] = useState(0)
  const etatRef = useRef<Etat>('pret')
  const [muet, setMuet] = useState(false)
  const muetRef = useRef(false)
  const jeu = useRef({
    y: SOL,
    vy: 0,
    vitesse: 6,
    distance: 0,
    score: 0,
    t: 0,
    prochain: 70,
    obstacles: [] as Obstacle[],
    bonus: [] as Bonus[],
    messages: [] as Message[],
    largeur: 600,
  })

  useEffect(() => {
    try {
      setRecord(Number(window.localStorage.getItem(CLE_RECORD)) || 0)
      muetRef.current = estMuet()
      setMuet(muetRef.current)
    } catch {
      // Stockage indisponible : pas de record gardé.
    }
  }, [])

  const changerEtat = (e: Etat) => {
    etatRef.current = e
    setEtat(e)
  }

  const reinitialiser = useCallback(() => {
    const j = jeu.current
    Object.assign(j, { y: SOL, vy: 0, vitesse: 6, distance: 0, score: 0, prochain: 70, obstacles: [], bonus: [], messages: [] })
    setScore(0)
  }, [])

  const sauter = useCallback(() => {
    if (etatRef.current === 'perdu') {
      reinitialiser()
      changerEtat('joue')
      return
    }
    if (etatRef.current === 'pret') changerEtat('joue')
    const j = jeu.current
    if (j.y >= SOL - 0.5) {
      j.vy = SAUT
      jouerSon('saut', muetRef.current)
    }
  }, [reinitialiser])

  // Taille du canevas (nette sur les écrans haute définition).
  useEffect(() => {
    const c = toile.current
    const b = boite.current
    if (!c || !b) return
    const ajuster = () => {
      const largeur = Math.max(300, b.clientWidth)
      const dpr = window.devicePixelRatio || 1
      c.width = largeur * dpr
      c.height = H * dpr
      c.style.width = `${largeur}px`
      c.style.height = `${H}px`
      c.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0)
      jeu.current.largeur = largeur
    }
    ajuster()
    const obs = new ResizeObserver(ajuster)
    obs.observe(b)
    return () => obs.disconnect()
  }, [])

  // Boucle de jeu.
  useEffect(() => {
    let id = 0
    let avant = performance.now()
    const boucle = (maintenant: number) => {
      id = requestAnimationFrame(boucle)
      const ctx = toile.current?.getContext('2d')
      if (!ctx) return
      const k = Math.min(3, (maintenant - avant) / (1000 / 60))
      avant = maintenant
      const j = jeu.current
      const L = j.largeur
      const enJeu = etatRef.current === 'joue'

      if (enJeu) {
        j.t += k
        j.vitesse = Math.min(13, 6 + j.distance / 1800)
        j.distance += j.vitesse * k
        j.score = Math.floor(j.distance / 10)
        // Saut
        j.vy += GRAVITE * k
        j.y = Math.min(SOL, j.y + j.vy * k)
        if (j.y >= SOL) j.vy = 0
        // Apparitions
        j.prochain -= j.vitesse * k
        if (j.prochain <= 0) {
          const avionPossible = j.distance > 3000
          if (avionPossible && Math.random() < 0.18) {
            j.obstacles.push({ type: 'avion', x: L + 20, y: SOL - 78, l: 30, h: 16 })
          } else {
            const type = AU_SOL[Math.floor(Math.random() * AU_SOL.length)]
            const d = DIMENSIONS[type]
            j.obstacles.push({ type, x: L + 20, y: SOL - d.h, ...d })
            // Parfois un deuxième obstacle collé (plus dur)
            if (j.distance > 5000 && Math.random() < 0.2) {
              const t2 = AU_SOL[Math.floor(Math.random() * AU_SOL.length)]
              const d2 = DIMENSIONS[t2]
              if (d.l + d2.l < 80) j.obstacles.push({ type: t2, x: L + 22 + d.l, y: SOL - d2.h, ...d2 })
            }
          }
          if (Math.random() < 0.45) {
            j.bonus.push({ type: Math.random() < 0.12 ? 'diplome' : 'euro', x: L + 160, y: SOL - 95, pris: false })
          }
          j.prochain = 260 + Math.random() * 260 + j.vitesse * 12
        }
        for (const o of j.obstacles) o.x -= j.vitesse * k
        for (const b of j.bonus) b.x -= j.vitesse * k
        j.obstacles = j.obstacles.filter((o) => o.x + o.l > -20)
        j.bonus = j.bonus.filter((b) => b.x > -20 && !b.pris)

        // Collisions (boîte du bonhomme un peu réduite pour être indulgent)
        const p = { x: X_PERSO + 13, y: j.y - 44, l: 14, h: 42 }
        for (const o of j.obstacles) {
          const marge = 4
          if (p.x < o.x + o.l - marge && p.x + p.l > o.x + marge && p.y < o.y + o.h - marge && p.y + p.h > o.y + marge) {
            changerEtat('perdu')
            jouerSon('perdu', muetRef.current)
            const final = j.score
            setRecord((r) => {
              const nouveau = Math.max(r, final)
              try {
                window.localStorage.setItem(CLE_RECORD, String(nouveau))
              } catch {
                // Stockage indisponible.
              }
              return nouveau
            })
            break
          }
        }
        for (const b of j.bonus) {
          if (Math.abs(b.x - (X_PERSO + 20)) < 18 && Math.abs(b.y - (j.y - 24)) < 28) {
            b.pris = true
            const points = b.type === 'diplome' ? 200 : 50
            jouerSon(b.type === 'diplome' ? 'diplome' : 'bonus', muetRef.current)
            j.distance += points * 10
            j.messages.push({ texte: b.type === 'diplome' ? '+200 Diplôme !' : '+50 Aide trouvée', x: b.x, y: b.y - 14, vie: 50 })
          }
        }
        for (const m of j.messages) {
          m.vie -= k
          m.y -= 0.6 * k
        }
        j.messages = j.messages.filter((m) => m.vie > 0)
        setScore(Math.floor(j.distance / 10))
      }

      dessinerDecor(ctx, L, j.distance)
      for (const b of j.bonus) dessinerBonus(ctx, b, j.t)
      for (const o of j.obstacles) dessinerObstacle(ctx, o, j.t)
      dessinerPerso(ctx, X_PERSO, j.y, j.t, j.y < SOL - 0.5, etatRef.current === 'perdu')
      ctx.font = 'bold 12px system-ui, sans-serif'
      ctx.textAlign = 'center'
      for (const m of j.messages) {
        ctx.fillStyle = `rgba(47,158,110,${Math.min(1, m.vie / 20)})`
        ctx.fillText(m.texte, m.x, m.y)
      }
      ctx.textAlign = 'start'
    }
    id = requestAnimationFrame(boucle)
    // Onglet caché : on met le jeu en pause.
    const visibilite = () => {
      if (document.hidden && etatRef.current === 'joue') changerEtat('pret')
    }
    document.addEventListener('visibilitychange', visibilite)
    return () => {
      cancelAnimationFrame(id)
      document.removeEventListener('visibilitychange', visibilite)
    }
  }, [])

  return (
    <section aria-labelledby="titre-jeu" className="rounded-3xl bg-card p-5 shadow-carte sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-step-blue">
            <Gamepad2 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="titre-jeu" className="text-lg font-bold text-foreground">
              {titre}
            </h2>
            <p className="text-sm text-muted-foreground">
              Saute par-dessus les tables, les livres et les dossiers. Attrape les € et les diplômes !
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
        <p className="flex items-center gap-3 font-semibold text-foreground tabular-nums">
          <span>Score {String(score).padStart(5, '0')}</span>
          <span className="flex items-center gap-1 text-step-orange">
            <Trophy className="size-4" aria-hidden="true" />
            {String(record).padStart(5, '0')}
          </span>
        </p>
        <BoutonSon
          muet={muet}
          onChange={(m) => {
            muetRef.current = m
            setMuet(m)
            changerMuet(m)
          }}
        />
        </div>
      </div>

      <div ref={boite} className="relative overflow-hidden rounded-2xl">
        <canvas
          ref={toile}
          tabIndex={0}
          role="img"
          aria-label="Jeu : le bonhomme de Passerelle court et saute par-dessus des obstacles. Espace, flèche du haut ou toucher pour sauter."
          onPointerDown={(e) => {
            e.preventDefault()
            e.currentTarget.focus()
            sauter()
          }}
          onKeyDown={(e) => {
            if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'Enter') {
              e.preventDefault()
              sauter()
            }
          }}
          className="block w-full cursor-pointer touch-manipulation rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
        />
        {etat !== 'joue' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-2xl bg-card/90 px-5 py-3 text-center shadow-carte backdrop-blur">
              {etat === 'pret' ? (
                <p className="font-bold text-foreground">
                  Touche l&apos;écran ou appuie sur Espace pour jouer
                </p>
              ) : (
                <>
                  <p className="font-bold text-foreground">Oups, un obstacle ! Score : {score}</p>
                  <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                    <RotateCcw className="size-4" aria-hidden="true" />
                    Touche ou appuie sur Espace pour rejouer
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{note}</p>
    </section>
  )
}
