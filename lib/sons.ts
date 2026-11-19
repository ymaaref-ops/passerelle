'use client'

// Petits sons des jeux, fabriqués par le navigateur (Web Audio) : aucun fichier à charger.
// Le son se coupe avec le bouton des jeux ; le choix est gardé dans le navigateur.

export type Son = 'saut' | 'bonus' | 'diplome' | 'perdu' | 'pose' | 'robot' | 'victoire' | 'defaite' | 'nul'

const CLE_MUET = 'passerelle_jeux_muet'
let contexte: AudioContext | null = null

export function estMuet(): boolean {
  try {
    return window.localStorage.getItem(CLE_MUET) === '1'
  } catch {
    return false
  }
}

export function changerMuet(muet: boolean): void {
  try {
    window.localStorage.setItem(CLE_MUET, muet ? '1' : '0')
  } catch {
    // Stockage indisponible : le choix vaut pour cette visite seulement.
  }
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  contexte ??= new Ctor()
  if (contexte.state === 'suspended') void contexte.resume()
  return contexte
}

/** Une note : fréquence de départ → d'arrivée, durée en secondes, décalage, forme d'onde, volume. */
function note(f1: number, f2: number, duree: number, decalage = 0, forme: OscillatorType = 'square', volume = 0.08) {
  const ctx = audio()
  if (!ctx) return
  const t = ctx.currentTime + decalage
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = forme
  osc.frequency.setValueAtTime(f1, t)
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + duree)
  gain.gain.setValueAtTime(volume, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duree)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + duree + 0.02)
}

export function jouerSon(son: Son, muet = estMuet()): void {
  if (muet) return
  switch (son) {
    case 'saut':
      note(380, 760, 0.14, 0, 'square', 0.05)
      break
    case 'bonus':
      note(880, 880, 0.07, 0, 'triangle', 0.09)
      note(1320, 1320, 0.12, 0.07, 'triangle', 0.09)
      break
    case 'diplome':
      ;[523, 659, 784, 1047].forEach((f, i) => note(f, f, 0.12, i * 0.08, 'triangle', 0.09))
      break
    case 'perdu':
      note(330, 110, 0.45, 0, 'sawtooth', 0.06)
      break
    case 'pose':
      note(600, 500, 0.08, 0, 'triangle', 0.08)
      break
    case 'robot':
      note(220, 180, 0.1, 0, 'square', 0.05)
      note(260, 220, 0.08, 0.1, 'square', 0.04)
      break
    case 'victoire':
      ;[523, 659, 784, 1047, 1319].forEach((f, i) => note(f, f, 0.14, i * 0.1, 'triangle', 0.09))
      break
    case 'defaite':
      ;[392, 330, 262].forEach((f, i) => note(f, f * 0.97, 0.22, i * 0.18, 'triangle', 0.08))
      break
    case 'nul':
      note(440, 440, 0.12, 0, 'triangle', 0.07)
      note(440, 440, 0.12, 0.16, 'triangle', 0.07)
      break
  }
}
