'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, ExternalLink, Mail, X } from 'lucide-react'
import { EMAIL_SUPPORT, lienSupport } from '@/lib/support'

const SUJET = 'Question sur Passerelle'

/**
 * Bouton « Contacter » : un simple lien mailto ne fait rien quand l'ordinateur n'a pas d'application de mail
 * configurée. On propose donc Gmail, Outlook, l'application de mail, ou de copier l'adresse.
 */
export function ContactSupport({
  children,
  className,
  ariaLabel,
  title,
}: {
  children: ReactNode
  className?: string
  ariaLabel?: string
  title?: string
}) {
  const [ouvert, setOuvert] = useState(false)
  const [copie, setCopie] = useState(false)

  useEffect(() => {
    if (!ouvert) return
    const fermer = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false)
    window.addEventListener('keydown', fermer)
    // La page derrière ne défile plus tant que la fenêtre est ouverte.
    const avant = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', fermer)
      document.body.style.overflow = avant
    }
  }, [ouvert])

  async function copier() {
    try {
      await navigator.clipboard.writeText(EMAIL_SUPPORT)
      setCopie(true)
      window.setTimeout(() => setCopie(false), 2000)
    } catch {
      /* le texte reste affiché et sélectionnable */
    }
  }

  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(EMAIL_SUPPORT)}&su=${encodeURIComponent(SUJET)}`
  const outlook = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(EMAIL_SUPPORT)}&subject=${encodeURIComponent(SUJET)}`
  const option =
    'flex h-12 items-center gap-3 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground outline-none hover:bg-primary-soft focus-visible:ring-4 focus-visible:ring-ring/30'

  return (
    <>
      <button type="button" onClick={() => setOuvert(true)} aria-label={ariaLabel} title={title} className={className}>
        {children}
      </button>
      {/* Rendue directement dans <body> : centrée sur l'écran et au-dessus de tout, où que soit le bouton. */}
      {ouvert &&
        createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          onClick={() => setOuvert(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-contact"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="titre-contact" className="text-lg font-bold text-foreground">
                  Écrire à l&apos;équipe Passerelle
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Choisis comment envoyer ton message.</p>
              </div>
              <button
                type="button"
                onClick={() => setOuvert(false)}
                aria-label="Fermer"
                className="flex size-9 shrink-0 items-center justify-center rounded-full outline-none hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/30"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <a href={gmail} target="_blank" rel="noopener noreferrer" className={option} onClick={() => setOuvert(false)}>
                <Mail className="size-4 text-primary" aria-hidden="true" />
                Avec Gmail
                <ExternalLink className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
              </a>
              <a href={outlook} target="_blank" rel="noopener noreferrer" className={option} onClick={() => setOuvert(false)}>
                <Mail className="size-4 text-primary" aria-hidden="true" />
                Avec Outlook
                <ExternalLink className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
              </a>
              <a href={lienSupport(SUJET)} className={option} onClick={() => setOuvert(false)}>
                <Mail className="size-4 text-primary" aria-hidden="true" />
                Avec mon application de mail
              </a>
              <button type="button" onClick={copier} className={option}>
                {copie ? (
                  <Check className="size-4 text-success" aria-hidden="true" />
                ) : (
                  <Copy className="size-4 text-primary" aria-hidden="true" />
                )}
                <span className="min-w-0 truncate">{copie ? 'Adresse copiée' : `Copier ${EMAIL_SUPPORT}`}</span>
              </button>
            </div>
          </div>
        </div>,
          document.body,
        )}
    </>
  )
}
