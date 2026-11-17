import { ArrowRight, Bot } from 'lucide-react'
import { phraseAgents, type Recapitulatif } from '@/lib/choix'

export function RecapAgents({ recap }: { recap: Recapitulatif }) {
  return (
    <section
      aria-labelledby="titre-recap"
      className="rounded-3xl border border-step-green-border bg-step-green-soft p-5 sm:p-6"
    >
      <h2 id="titre-recap" className="text-xl font-bold text-foreground">
        Passerelle va :
      </h2>

      <div aria-live="polite" aria-atomic="true">
        {recap.lignes.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {recap.lignes.map((ligne) => (
              <li key={ligne.id} className="flex items-start gap-3 leading-relaxed text-foreground">
                <span
                  aria-hidden="true"
                  className="mt-2.5 size-2 shrink-0 rounded-full bg-step-green"
                />
                <span>
                  {ligne.texte}
                  {ligne.montant && (
                    <>
                      {' '}
                      <strong className="font-bold whitespace-nowrap">{ligne.montant}</strong>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-muted-foreground">
            Coche au moins une démarche ci-dessus pour voir ce que Passerelle fera pour toi.
          </p>
        )}

        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-card px-4 py-3 text-lg font-bold text-step-green">
          <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
          <Bot className="size-5 shrink-0" aria-hidden="true" />
          {phraseAgents(recap.agents)}
        </p>
      </div>
    </section>
  )
}
