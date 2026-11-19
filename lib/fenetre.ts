/** Ouvre la fenêtre de l'agent dans une fenêtre pop-up, à côté de Passerelle. */
export function ouvrirFenetre(lien: string) {
  const largeur = Math.min(1100, window.screen.availWidth - 80)
  const hauteur = Math.min(860, window.screen.availHeight - 80)
  const gauche = Math.max(0, (window.screen.availWidth - largeur) / 2)
  const haut = Math.max(0, (window.screen.availHeight - hauteur) / 2)
  const fenetre = window.open(
    lien,
    'passerelle-agent',
    `popup=yes,width=${largeur},height=${hauteur},left=${gauche},top=${haut}`,
  )
  // Pop-up bloquée : on ouvre dans un nouvel onglet.
  if (!fenetre) window.open(lien, '_blank', 'noopener')
  else fenetre.focus()
}

/** Adresse de la page /fenetre-agent pour une session H (le lien de partage H renvoie du JSON, pas une page). */
export function adresseFenetre(sessionId: string, lienPartage: string, source: 'demande' | 'logement' = 'demande') {
  const params = new URLSearchParams({ session: sessionId, lien: lienPartage })
  if (source !== 'demande') params.set('source', source)
  return `/fenetre-agent?${params.toString()}`
}
