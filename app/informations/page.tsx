import type { Metadata } from 'next'
import Link from 'next/link'
import { EMAIL_SUPPORT } from '@/lib/support'

export const metadata: Metadata = {
  title: 'Mentions légales, CGU et confidentialité — Passerelle',
  description: 'Qui édite Passerelle, les conditions d’utilisation et ce que nous faisons de tes données.',
}

function Section({ id, titre, children }: { id: string; titre: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`titre-${id}`} className="scroll-mt-6 rounded-3xl bg-card p-5 shadow-carte sm:p-6">
      <h2 id={`titre-${id}`} className="text-xl font-bold text-foreground">
        {titre}
      </h2>
      <div className="mt-3 flex flex-col gap-3 leading-relaxed text-foreground/90">{children}</div>
    </section>
  )
}

export default function InformationsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Informations légales</h1>
        <p className="mt-2 text-muted-foreground">
          <a href="#mentions-legales" className="font-semibold text-primary hover:underline">Mentions légales</a>
          {' · '}
          <a href="#cgu" className="font-semibold text-primary hover:underline">Conditions d&apos;utilisation</a>
          {' · '}
          <a href="#confidentialite" className="font-semibold text-primary hover:underline">Politique de confidentialité</a>
        </p>
      </div>

      <Section id="mentions-legales" titre="Mentions légales">
        <p>
          Passerelle est un projet étudiant réalisé pour le hackathon « Build The Future » (Eugenia School × H Company).
          Ce n&apos;est pas un service public ni un organisme officiel (CAF, Crous, Action Logement…).
        </p>
        <p>Contact : {EMAIL_SUPPORT}</p>
        <p>
          Hébergement du site : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis. Données : Supabase.
          Automatisations : n8n Cloud.
        </p>
      </Section>

      <Section id="cgu" titre="Conditions générales d'utilisation">
        <p>
          Passerelle t&apos;aide gratuitement à repérer les aides étudiantes et à préparer tes démarches. C&apos;est une
          version de démonstration : utilise de préférence des documents et des données fictives.
        </p>
        <p>
          Les montants affichés sont des estimations, faites avec les simulateurs officiels. Le montant définitif est
          toujours fixé par l&apos;organisme (CAF, Crous, banque…).
        </p>
        <p>
          Des agents automatiques remplissent des simulateurs et des formulaires pour toi. Ils ne valident et
          n&apos;envoient jamais une demande à ta place : c&apos;est toujours toi qui vérifies et qui valides sur le site
          officiel.
        </p>
        <p>
          Tu t&apos;engages à n&apos;utiliser que tes propres documents, ou des documents fictifs, et à ne pas déclarer
          d&apos;informations fausses à un organisme.
        </p>
      </Section>

      <Section id="confidentialite" titre="Politique de confidentialité">
        <p>
          <strong>Ce que nous gardons :</strong> ton prénom et ton e-mail (ton compte), les documents que tu déposes et
          les informations lues dessus (identité, logement, études, revenus), tes réponses aux questions et le résultat
          de tes démarches.
        </p>
        <p>
          <strong>Pourquoi :</strong> lire tes documents, estimer tes aides et préparer tes démarches. Nous le faisons
          avec ton accord, que tu donnes en créant ton compte et avant chaque analyse de documents.
        </p>
        <p>
          <strong>Qui y a accès :</strong> l&apos;équipe Passerelle et les services techniques nécessaires au
          fonctionnement : Supabase (stockage), n8n (automatisations), Hugging Face (lecture des documents), H Company
          (agents qui remplissent les simulateurs) et Vercel (hébergement du site). Tes données ne sont jamais vendues.
        </p>
        <p>
          <strong>Combien de temps :</strong> les photos de tes documents sont gardées 30 jours au plus. Le reste est
          gardé tant que ton compte existe.
        </p>
        <p>
          <strong>Tes droits :</strong> tu peux consulter et corriger tes informations dans{' '}
          <Link href="/profil" className="font-semibold text-primary hover:underline">Mon profil</Link>, supprimer un
          document dans Mes documents, et demander la suppression de ton compte ou de tes données en écrivant à{' '}
          {EMAIL_SUPPORT}. Tu peux aussi saisir la CNIL (cnil.fr).
        </p>
      </Section>
    </div>
  )
}
