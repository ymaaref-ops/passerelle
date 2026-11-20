'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Minus, Plus, X } from 'lucide-react'
import type { Logement } from '@/lib/logement'
import { cn } from '@/lib/utils'

/**
 * Carte géographique des logements trouvés (fonds OpenStreetMap, sans bibliothèque) :
 * une épingle numérotée par logement ; un clic ouvre une bulle avec la photo et l'essentiel,
 * et « Plus d'infos » ouvre la fiche complète en dessous.
 * Les adresses sont placées avec la Base Adresse Nationale (api-adresse.data.gouv.fr).
 */

const TUILE = 256
const HAUTEUR = 380
const cacheGeo = new Map<string, [number, number] | null>()

/** Texte à chercher pour un logement : son adresse, sinon le code postal ou l'arrondissement du titre. */
function requete(l: Logement, ville: string): string | null {
  if (l.adresse && l.adresse.trim().length > 2) return /\d{5}|paris|lyon|marseille/i.test(l.adresse) ? l.adresse : `${l.adresse} ${ville}`
  const texte = `${l.titre ?? ''}`
  const cp = /\b\d{5}\b/.exec(texte)?.[0]
  if (cp) return cp
  const arr = /Paris\s+(\d{1,2})\s*(?:e|er|ème)\b/i.exec(texte)
  if (arr) return `750${arr[1].padStart(2, '0')} Paris`
  return ville || null
}

async function geocoder(q: string): Promise<[number, number] | null> {
  if (cacheGeo.has(q)) return cacheGeo.get(q) ?? null
  try {
    const r = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=1`)
    const j = (await r.json()) as { features?: { geometry: { coordinates: [number, number] } }[] }
    const c = j.features?.[0]?.geometry.coordinates ?? null
    const point: [number, number] | null = c ? [c[1], c[0]] : null
    cacheGeo.set(q, point)
    return point
  } catch {
    return null
  }
}

/** Projection Web Mercator : latitude/longitude → pixels au niveau de zoom z. */
function versPixels(lat: number, lon: number, z: number): [number, number] {
  const n = TUILE * 2 ** z
  const rad = (lat * Math.PI) / 180
  return [((lon + 180) / 360) * n, ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n]
}

const euros = (v: number | null | undefined) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? '—' : `${Math.round(Number(v))} €`

export function CarteGeo({
  logements,
  ville,
  onPlusInfos,
}: {
  logements: Logement[]
  ville: string
  onPlusInfos: (index: number) => void
}) {
  const boite = useRef<HTMLDivElement>(null)
  const [largeur, setLargeur] = useState(600)
  const [points, setPoints] = useState<([number, number] | null)[]>([])
  const [choisi, setChoisi] = useState<number | null>(null)
  const [zoomEnPlus, setZoomEnPlus] = useState(0)

  useEffect(() => {
    const b = boite.current
    if (!b) return
    const maj = () => setLargeur(b.clientWidth)
    maj()
    const obs = new ResizeObserver(maj)
    obs.observe(b)
    return () => obs.disconnect()
  }, [])

  const cle = logements.map((l) => requete(l, ville)).join('|')
  useEffect(() => {
    let actif = true
    Promise.all(logements.map((l) => {
      const q = requete(l, ville)
      return q ? geocoder(q) : Promise.resolve(null)
    })).then((p) => {
      if (actif) setPoints(p)
    })
    return () => {
      actif = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle])

  const vue = useMemo(() => {
    const connus = points.filter((p): p is [number, number] => Boolean(p))
    if (!connus.length) return null
    // Zoom le plus fort où tous les logements tiennent dans la carte (avec une marge).
    let z = 15
    for (; z > 3; z--) {
      const px = connus.map(([la, lo]) => versPixels(la, lo, z))
      const xs = px.map((p) => p[0])
      const ys = px.map((p) => p[1])
      if (Math.max(...xs) - Math.min(...xs) < largeur - 90 && Math.max(...ys) - Math.min(...ys) < HAUTEUR - 110) break
    }
    if (connus.length === 1) z = 14
    z = Math.max(3, Math.min(18, z + zoomEnPlus))
    const px = connus.map(([la, lo]) => versPixels(la, lo, z))
    const cx = (Math.min(...px.map((p) => p[0])) + Math.max(...px.map((p) => p[0]))) / 2
    const cy = (Math.min(...px.map((p) => p[1])) + Math.max(...px.map((p) => p[1]))) / 2 + 20
    return { z, gauche: cx - largeur / 2, haut: cy - HAUTEUR / 2 }
  }, [points, largeur, zoomEnPlus])

  // Épingles (décalées en cercle quand plusieurs logements tombent au même endroit).
  const epingles = useMemo(() => {
    if (!vue) return []
    const vus = new Map<string, number>()
    return points.map((p, i) => {
      if (!p) return null
      const [x, y] = versPixels(p[0], p[1], vue.z)
      const cle = `${Math.round(x / 6)}:${Math.round(y / 6)}`
      const rang = vus.get(cle) ?? 0
      vus.set(cle, rang + 1)
      const angle = rang * 2.1
      const ecart = rang ? 26 : 0
      return { i, x: x - vue.gauche + Math.cos(angle) * ecart, y: y - vue.haut + Math.sin(angle) * ecart }
    })
  }, [points, vue])

  const tuiles = useMemo(() => {
    if (!vue) return []
    const max = 2 ** vue.z
    const liste: { x: number; y: number; url: string }[] = []
    for (let tx = Math.floor(vue.gauche / TUILE); tx <= Math.floor((vue.gauche + largeur) / TUILE); tx++) {
      for (let ty = Math.floor(vue.haut / TUILE); ty <= Math.floor((vue.haut + HAUTEUR) / TUILE); ty++) {
        if (ty < 0 || ty >= max) continue
        const nx = ((tx % max) + max) % max
        liste.push({
          x: tx * TUILE - vue.gauche,
          y: ty * TUILE - vue.haut,
          url: `https://tile.openstreetmap.org/${vue.z}/${nx}/${ty}.png`,
        })
      }
    }
    return liste
  }, [vue, largeur])

  const sansPosition = points.length > 0 && points.every((p) => !p)
  const selection = choisi !== null ? logements[choisi] : null
  const epingleChoisie = choisi !== null ? epingles[choisi] : null

  return (
    <section aria-label="Carte des logements" className="overflow-hidden rounded-3xl bg-card shadow-carte">
      <div ref={boite} className="relative bg-primary-soft" style={{ height: HAUTEUR }}>
        {tuiles.map((t) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={t.url + t.x}
            src={t.url}
            alt=""
            draggable={false}
            className="pointer-events-none absolute select-none"
            style={{ left: t.x, top: t.y, width: TUILE, height: TUILE }}
          />
        ))}

        {!vue && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-muted-foreground">
            {sansPosition ? "On n'a pas pu placer ces logements sur la carte." : 'Placement des logements sur la carte…'}
          </p>
        )}

        {epingles.map((e) =>
          e ? (
            <button
              key={e.i}
              type="button"
              onClick={() => setChoisi(choisi === e.i ? null : e.i)}
              aria-label={`Logement ${e.i + 1} : ${logements[e.i].titre ?? ''}, ${euros(logements[e.i].reste_a_payer)} par mois`}
              aria-pressed={choisi === e.i}
              className="absolute z-10 -translate-x-1/2 -translate-y-full outline-none"
              style={{ left: e.x, top: e.y }}
            >
              <span
                className={cn(
                  'flex items-center gap-1 rounded-full border-2 border-card px-2.5 py-1 text-sm font-bold whitespace-nowrap shadow-lg transition-transform',
                  choisi === e.i ? 'scale-110 bg-step-orange text-white' : 'bg-primary text-primary-foreground hover:scale-105',
                )}
              >
                {e.i + 1} · {euros(logements[e.i].reste_a_payer)}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'mx-auto block size-3 -translate-y-1.5 rotate-45 border-r-2 border-b-2 border-card',
                  choisi === e.i ? 'bg-step-orange' : 'bg-primary',
                )}
              />
            </button>
          ) : null,
        )}

        {/* Bulle du logement choisi */}
        {selection && epingleChoisie && (
          <div
            role="dialog"
            aria-label={selection.titre ?? 'Logement'}
            className="absolute z-20 w-64 -translate-x-1/2 overflow-hidden rounded-2xl bg-card shadow-2xl"
            style={{
              left: Math.min(Math.max(epingleChoisie.x, 136), largeur - 136),
              // Au-dessus de l'épingle s'il y a la place, sinon en dessous ; toujours entière dans la carte.
              top: Math.max(
                8,
                Math.min(
                  epingleChoisie.y - 40 - 210 >= 8 ? epingleChoisie.y - 40 - 210 : epingleChoisie.y + 8,
                  HAUTEUR - 218,
                ),
              ),
            }}
          >
            <div className="relative h-24 bg-primary-soft">
              {selection.photo && /^https:\/\//.test(selection.photo) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selection.photo}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                  onError={(ev) => (ev.currentTarget.style.display = 'none')}
                />
              ) : null}
              <button
                type="button"
                onClick={() => setChoisi(null)}
                aria-label="Fermer"
                className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-card/90 text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col gap-1 p-3">
              <p className="line-clamp-2 text-sm font-bold text-foreground">{selection.titre ?? 'Logement'}</p>
              {selection.adresse && <p className="truncate text-xs text-muted-foreground">{selection.adresse}</p>}
              <p className="text-lg font-extrabold text-primary">
                {euros(selection.reste_a_payer)}
                <span className="text-xs font-bold">/mois après aide</span>
              </p>
              <button
                type="button"
                onClick={() => onPlusInfos(choisi as number)}
                className="mt-1 inline-flex items-center gap-1 self-start text-sm font-semibold text-step-blue hover:underline"
              >
                Plus d&apos;infos
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {vue && (
          <div className="absolute top-3 right-3 z-10 flex flex-col overflow-hidden rounded-xl bg-card shadow-carte">
            <button
              type="button"
              aria-label="Zoomer"
              onClick={() => setZoomEnPlus((z) => Math.min(z + 1, 4))}
              className="flex size-9 items-center justify-center text-foreground hover:bg-muted"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Dézoomer"
              onClick={() => setZoomEnPlus((z) => Math.max(z - 1, -4))}
              className="flex size-9 items-center justify-center border-t border-border text-foreground hover:bg-muted"
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <p className="absolute right-0 bottom-0 z-10 rounded-tl-lg bg-card/85 px-2 py-0.5 text-[11px] text-muted-foreground">
          ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
            OpenStreetMap
          </a>
        </p>
      </div>
      <p className="px-5 py-3 text-sm text-muted-foreground">
        Touche une épingle pour voir le logement. La position est celle de l&apos;adresse indiquée dans l&apos;annonce
        (souvent le quartier ou l&apos;arrondissement).
      </p>
    </section>
  )
}
