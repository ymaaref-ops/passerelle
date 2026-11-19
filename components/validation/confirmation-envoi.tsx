import { Check, CircleAlert, Mail, Paperclip } from 'lucide-react'
import { formaterDateHeure, type RecapMail } from '@/lib/validation'
import { sessionCourante } from '@/lib/compte'

export type StatutMail = 'envoi' | 'ok' | 'erreur'

interface ConfirmationEnvoiProps {
  recap: RecapMail
  statutMail: StatutMail
  onReessayer: () => void
}

const POINTS_DECO = ['bg-step-blue', 'bg-step-violet', 'bg-step-green', 'bg-step-orange']

function MessageMail({ statut, onReessayer }: { statut: StatutMail; onReessayer: () => void }) {
  if (statut === 'ok') {
    return (
      <p className="flex items-center gap-2 text-lg font-semibold text-step-green">
        <Mail className="size-5" aria-hidden="true" />
        Un mail récapitulatif t&apos;a été envoyé
      </p>
    )
  }
  if (statut === 'erreur') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex items-center gap-2 text-base font-semibold text-danger">
          <CircleAlert className="size-5" aria-hidden="true" />
          Le mail récapitulatif n&apos;a pas pu partir.
        </p>
        <button
          type="button"
          onClick={onReessayer}
          className="inline-flex h-10 items-center rounded-full border border-danger bg-card px-4 text-sm font-semibold text-danger outline-none hover:bg-danger-soft focus-visible:ring-4 focus-visible:ring-danger/30"
        >
          Réessayer
        </button>
      </div>
    )
  }
  return (
    <p className="flex items-center gap-2 text-base text-muted-foreground">
      <Mail className="size-5" aria-hidden="true" />
      Envoi du mail récapitulatif…
    </p>
  )
}

export function ConfirmationEnvoi({ recap, statutMail, onReessayer }: ConfirmationEnvoiProps) {
  return (
    <section
      aria-labelledby="titre-confirmation"
      className="flex scroll-mt-24 flex-col gap-6 rounded-3xl border border-step-green-border bg-step-green-soft p-6 sm:p-8"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex gap-2" aria-hidden="true">
          {POINTS_DECO.map((couleur, i) => (
            <span
              key={couleur}
              className={`size-2 animate-row-in rounded-full ${couleur}`}
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </span>
        <span className="flex size-16 animate-check-pop items-center justify-center rounded-full bg-step-green text-white">
          <Check className="size-9" strokeWidth={3} aria-hidden="true" />
        </span>
        <h2 id="titre-confirmation" className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
          C&apos;est envoyé !
        </h2>
        <div role="status" aria-live="polite">
          <MessageMail statut={statutMail} onReessayer={onReessayer} />
        </div>
      </div>

      <article
        aria-label="Aperçu du mail récapitulatif"
        className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-card shadow-carte"
      >
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-b border-border bg-muted px-5 py-4 text-sm">
          <dt className="text-muted-foreground">De</dt>
          <dd className="font-semibold text-foreground">Passerelle</dd>
          <dt className="text-muted-foreground">À</dt>
          <dd className="font-semibold text-foreground">{recap.destinataire}</dd>
          <dt className="text-muted-foreground">Objet</dt>
          <dd className="font-semibold text-foreground">{recap.objet}</dd>
        </dl>

        <div className="flex flex-col gap-4 px-5 py-5 text-base text-foreground">
          <p>Bonjour{sessionCourante()?.prenom ? ` ${sessionCourante()?.prenom}` : ''},</p>
          <p>Voici ce que tu as envoyé avec Passerelle :</p>

          <ul className="flex flex-col gap-3">
            {recap.envoyees.map((ligne) => (
              <li key={ligne.demarche} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-step-green text-white">
                  <Check className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">{ligne.demarche}</p>
                  <p className="text-sm text-muted-foreground">
                    À {ligne.destinataire} · {formaterDateHeure(ligne.envoyeeLe)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div>
            <p className="text-sm font-semibold text-muted-foreground">Pièces jointes</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {recap.piecesJointes.map((nom) => (
                <li
                  key={nom}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-sm"
                >
                  <Paperclip className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {nom}
                </li>
              ))}
            </ul>
          </div>

          <p>À bientôt,</p>
          <p className="font-semibold">L&apos;équipe Passerelle</p>
        </div>
      </article>
    </section>
  )
}
