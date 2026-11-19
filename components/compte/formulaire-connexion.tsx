'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { KeyRound, Loader2, LogIn, MailCheck, UserPlus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  changerMotDePasse,
  creerCompte,
  demanderNouveauMotDePasse,
  jetonValide,
  renvoyerConfirmation,
  seConnecter,
} from '@/lib/compte'
import { cn } from '@/lib/utils'

type Mode = 'connexion' | 'creation'

const CHAMP =
  'h-12 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus-visible:ring-4 focus-visible:ring-ring/30'

export function FormulaireConnexion() {
  const router = useRouter()
  const params = useSearchParams()
  const suiteBrute = params.get('suite') ?? '/demarrer'
  const suite = suiteBrute.startsWith('/') && !suiteBrute.startsWith('//') ? suiteBrute : '/demarrer'

  const [mode, setMode] = useState<Mode>('connexion')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [accepte, setAccepte] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [aConfirmer, setAConfirmer] = useState(false)

  const [renvoye, setRenvoye] = useState(false)
  // Mot de passe oublié : 'demande' (saisie de l'e-mail), 'envoye' (lien parti), 'nouveau' (arrivée par le lien).
  const nouveauDemande = params.get('nouveau') === '1'
  const [oubli, setOubli] = useState<'non' | 'demande' | 'envoye' | 'nouveau'>(nouveauDemande ? 'nouveau' : 'non')
  const [confirmation, setConfirmation] = useState('')
  const [change, setChange] = useState(false)

  // Lien de confirmation expiré ou invalide : Supabase l'indique dans l'adresse.
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('error')) {
      const code = new URLSearchParams(hash.replace(/^#/, '')).get('error_code')
      setErreur(
        code === 'otp_expired'
          ? 'Ce lien de confirmation a expiré ou a déjà servi. Connecte-toi, ou crée ton compte à nouveau pour recevoir un nouveau lien.'
          : "Le lien de confirmation n'a pas marché. Connecte-toi, ou demande un nouveau lien.",
      )
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  // Déjà connecté : on passe directement aux démarches.
  useEffect(() => {
    if (nouveauDemande) return
    jetonValide().then((jeton) => {
      if (jeton) router.replace(suite)
    })
  }, [router, suite, nouveauDemande])

  async function envoyerLien(e: React.FormEvent) {
    e.preventDefault()
    setErreur(null)
    setEnCours(true)
    try {
      await demanderNouveauMotDePasse(email.trim())
      setOubli('envoye')
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Le lien n'a pas pu être envoyé.")
    } finally {
      setEnCours(false)
    }
  }

  async function enregistrerNouveau(e: React.FormEvent) {
    e.preventDefault()
    setErreur(null)
    if (motDePasse !== confirmation) {
      setErreur('Les deux mots de passe ne sont pas identiques.')
      return
    }
    setEnCours(true)
    try {
      await changerMotDePasse(motDePasse)
      setChange(true)
      window.setTimeout(() => router.replace('/demarrer'), 1500)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Le mot de passe n'a pas pu être changé.")
    } finally {
      setEnCours(false)
    }
  }

  async function valider(e: React.FormEvent) {
    e.preventDefault()
    setErreur(null)
    setEnCours(true)
    try {
      if (mode === 'creation') {
        const resultat = await creerCompte(prenom.trim(), email.trim(), motDePasse)
        if (resultat === 'confirmer') {
          setAConfirmer(true)
          return
        }
      } else {
        await seConnecter(email.trim(), motDePasse)
      }
      router.push(suite)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Ça n'a pas marché.")
    } finally {
      setEnCours(false)
    }
  }

  const messageErreurVue = erreur && (
    <p role="alert" className="text-sm font-medium text-danger">
      {erreur}
    </p>
  )
  const bouton = cn(buttonVariants({ size: 'lg' }), 'h-12 gap-2 rounded-2xl text-base font-semibold')

  if (oubli === 'nouveau') {
    return (
      <section className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Choisis un nouveau mot de passe</h1>
          <p className="mt-2 leading-relaxed text-muted-foreground">8 caractères minimum.</p>
        </div>
        {change ? (
          <p role="status" className="rounded-2xl border border-step-green-border bg-step-green-soft p-4 font-semibold text-step-green">
            C&apos;est fait : ton mot de passe est changé. On t&apos;emmène à tes démarches…
          </p>
        ) : (
          <form onSubmit={enregistrerNouveau} className="flex flex-col gap-4 rounded-3xl bg-card shadow-carte p-5 sm:p-6">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Nouveau mot de passe</span>
              <input required type="password" minLength={8} autoComplete="new-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} className={CHAMP} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Le même, une deuxième fois</span>
              <input required type="password" minLength={8} autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={CHAMP} />
            </label>
            {messageErreurVue}
            <button type="submit" disabled={enCours} className={bouton}>
              {enCours ? <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" /> : <KeyRound className="size-5" aria-hidden="true" />}
              Enregistrer mon mot de passe
            </button>
          </form>
        )}
      </section>
    )
  }

  if (oubli === 'demande' || oubli === 'envoye') {
    return (
      <section className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mot de passe oublié</h1>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            Donne l&apos;e-mail de ton compte : on t&apos;envoie un lien pour en choisir un nouveau.
          </p>
        </div>
        {oubli === 'envoye' ? (
          <div className="flex flex-col gap-3 rounded-3xl border border-step-blue-border bg-step-blue-soft p-6">
            <MailCheck className="size-8 text-step-blue" aria-hidden="true" />
            <p className="leading-relaxed text-foreground">
              Si un compte existe avec <strong>{email}</strong>, tu vas recevoir un e-mail. Clique sur le lien : tu
              reviendras ici pour choisir ton nouveau mot de passe. Pense à regarder dans les indésirables.
            </p>
          </div>
        ) : (
          <form onSubmit={envoyerLien} className="flex flex-col gap-4 rounded-3xl bg-card shadow-carte p-5 sm:p-6">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">E-mail</span>
              <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={CHAMP} />
            </label>
            {messageErreurVue}
            <button type="submit" disabled={enCours} className={bouton}>
              {enCours ? <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" /> : <MailCheck className="size-5" aria-hidden="true" />}
              M&apos;envoyer un lien
            </button>
          </form>
        )}
        <button
          type="button"
          onClick={() => {
            setOubli('non')
            setErreur(null)
          }}
          className="self-start text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          ← Revenir à la connexion
        </button>
      </section>
    )
  }

  if (aConfirmer) {
    return (
      <section className="flex flex-col gap-4 rounded-3xl border border-step-blue-border bg-step-blue-soft p-6">
        <MailCheck className="size-8 text-step-blue" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-foreground">Vérifie ta boîte mail</h1>
        <p className="leading-relaxed text-foreground">
          On t&apos;a envoyé un lien à <strong>{email}</strong>. Clique dessus : tu reviendras directement sur
          Passerelle, déjà connecté.
        </p>
        <button
          type="button"
          disabled={renvoye}
          onClick={async () => {
            try {
              await renvoyerConfirmation(email.trim())
              setRenvoye(true)
            } catch (err) {
              setErreur(err instanceof Error ? err.message : "Le lien n'a pas pu être renvoyé.")
            }
          }}
          className="self-start text-sm font-semibold text-primary underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline"
        >
          {renvoye ? 'Nouveau lien envoyé' : "Je n'ai rien reçu : renvoyer le lien"}
        </button>
        {erreur && (
          <p role="alert" className="text-sm font-medium text-danger">
            {erreur}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setAConfirmer(false)
            setMode('connexion')
          }}
          className={cn(buttonVariants({ size: 'lg' }), 'h-12 rounded-2xl text-base font-semibold')}
        >
          J&apos;ai confirmé, je me connecte
        </button>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {mode === 'connexion' ? 'Content de te revoir' : 'Crée ton compte'}
        </h1>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          {mode === 'connexion'
            ? 'Connecte-toi pour retrouver tes documents et tes démarches.'
            : 'Tes documents seront gardés : tu n’auras pas à les redonner à chaque fois.'}
        </p>
      </div>

      <div role="tablist" aria-label="Connexion ou création de compte" className="grid grid-cols-2 rounded-2xl bg-muted p-1">
        {(
          [
            ['connexion', 'Se connecter'],
            ['creation', 'Créer un compte'],
          ] as const
        ).map(([valeur, libelle]) => (
          <button
            key={valeur}
            type="button"
            role="tab"
            aria-selected={mode === valeur}
            onClick={() => {
              if (valeur !== mode) {
                setEmail('')
                setMotDePasse('')
                setAccepte(false)
              }
              setMode(valeur)
              setErreur(null)
            }}
            className={cn(
              'h-10 rounded-xl text-sm font-semibold transition-colors',
              mode === valeur ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {libelle}
          </button>
        ))}
      </div>

      <form onSubmit={valider} className="flex flex-col gap-4 rounded-3xl bg-card shadow-carte p-5 sm:p-6">
        {mode === 'creation' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Prénom</span>
            <input
              required
              autoComplete="given-name"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              className={CHAMP}
            />
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">E-mail</span>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={CHAMP}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Mot de passe</span>
          <input
            required
            type="password"
            minLength={mode === 'creation' ? 8 : undefined}
            autoComplete={mode === 'creation' ? 'new-password' : 'current-password'}
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className={CHAMP}
          />
          {mode === 'creation' && <span className="text-sm text-muted-foreground">8 caractères minimum.</span>}
          {mode === 'connexion' && (
            <button
              type="button"
              onClick={() => {
                setOubli('demande')
                setErreur(null)
              }}
              className="self-end text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Mot de passe oublié ?
            </button>
          )}
        </label>

        {mode === 'creation' && (
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              required
              checked={accepte}
              onChange={(e) => setAccepte(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span>
              J&apos;accepte la{' '}
              <a href="/informations#confidentialite" target="_blank" className="font-semibold text-primary underline-offset-4 hover:underline">
                politique de confidentialité
              </a>{' '}
              et les{' '}
              <a href="/informations#cgu" target="_blank" className="font-semibold text-primary underline-offset-4 hover:underline">
                conditions générales d&apos;utilisation
              </a>
              .
            </span>
          </label>
        )}

        {erreur && (
          <p role="alert" className="text-sm font-medium text-danger">
            {erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={enCours || (mode === 'creation' && !accepte)}
          className={cn(buttonVariants({ size: 'lg' }), 'h-12 gap-2 rounded-2xl text-base font-semibold')}
        >
          {enCours ? (
            <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" />
          ) : mode === 'connexion' ? (
            <LogIn className="size-5" aria-hidden="true" />
          ) : (
            <UserPlus className="size-5" aria-hidden="true" />
          )}
          {mode === 'connexion' ? 'Me connecter' : 'Créer mon compte'}
        </button>
      </form>
    </section>
  )
}
