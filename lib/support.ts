/** Adresse de support de Passerelle (l'équipe). */
export const EMAIL_SUPPORT = 'team1@eugeniaschool.com'

export function lienSupport(sujet = 'Question sur Passerelle'): string {
  return `mailto:${EMAIL_SUPPORT}?subject=${encodeURIComponent(sujet)}`
}
