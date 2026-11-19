import type { MetadataRoute } from 'next'

/** Pour « Ajouter à l'écran d'accueil » sur téléphone : nom, couleurs et icônes de Passerelle. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Passerelle',
    short_name: 'Passerelle',
    description: 'Le copilote du financement étudiant : tes aides, tes documents et tes démarches au même endroit.',
    start_url: '/',
    display: 'standalone',
    background_color: '#18205e',
    theme_color: '#18205e',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  }
}
