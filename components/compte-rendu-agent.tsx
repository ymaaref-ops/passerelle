import { cn } from '@/lib/utils'

/**
 * Découpe le compte rendu d'un agent en points : retours à la ligne, listes « - … »,
 * étapes « 1) … 2) … », puis phrases. Ce qui est entre « » ou entre parenthèses n'est jamais coupé.
 */
export function decouperCompteRendu(texte: string): string[] {
  const morceaux: string[] = []
  for (const ligne of texte.replace(/\*\*/g, '').split(/\n+/)) {
    let courant = ''
    let profondeur = 0
    for (let i = 0; i < ligne.length; i++) {
      const c = ligne[i]
      if (c === '«' || c === '(') profondeur++
      if ((c === '»' || c === ')') && profondeur > 0) profondeur--
      const reste = ligne.slice(i)
      const tiret = profondeur === 0 && /^\s-\s+\S/.test(reste) && courant.trim() !== ''
      const etape = profondeur === 0 && /^\s\d{1,2}\)\s/.test(reste) && courant.trim() !== ''
      const phrase = profondeur === 0 && c === '.' && /^\.\s+[A-ZÉÈÀÂÎÔÇ«]/.test(reste) && courant.trim().length > 10
      if (tiret || etape) {
        morceaux.push(courant)
        courant = ''
        if (tiret) i = i + reste.indexOf('-')
        continue
      }
      courant += c
      if (phrase) {
        morceaux.push(courant)
        courant = ''
      }
    }
    morceaux.push(courant)
  }
  return morceaux.map((m) => m.replace(/^[\s\-–•]+/, '').trim()).filter((m) => m.length > 1)
}

/** Compte rendu d'un agent en liste à puces, plus lisible qu'un bloc de texte. */
export function CompteRenduAgent({ texte, className }: { texte: string; className?: string }) {
  const points = decouperCompteRendu(texte)
  if (points.length <= 1) return <p className={cn('text-sm leading-relaxed', className)}>{points[0] ?? texte}</p>
  return (
    <ul className={cn('flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed marker:text-primary', className)}>
      {points.map((p, i) => (
        <li key={i}>{p}</li>
      ))}
    </ul>
  )
}
