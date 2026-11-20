-- Passerelle : schéma de la base Supabase (projet hnziztstifpipxrgdnop), exporté le 19/11/2026.
-- Structure seulement : aucune donnée d'étudiant. Les données de référence (catalogue des aides) sont dans donnees-reference.sql.
-- Ordre : tables, clés étrangères, vue, fonctions, déclencheurs, tâches planifiées (pg_cron + pg_net).

create extension if not exists pgcrypto;

-- Table aides
create table if not exists public.aides (
  code text not null,
  nom text not null,
  explication text not null,
  categorie text not null,
  montant text,
  montant_max numeric,
  conditions text,
  date_limite text,
  lien text,
  source text,
  date_verification date,
  niveau text not null,
  regle_eligibilite jsonb,
  ordre integer not null default 100,
  constraint aides_pkey PRIMARY KEY (code),
  constraint aides_categorie_check CHECK ((categorie = ANY (ARRAY['Études'::text, 'Logement'::text, 'Vie quotidienne'::text, 'Travail'::text]))),
  constraint aides_niveau_check CHECK ((niveau = ANY (ARRAY['automatisee'::text, 'guidee'::text, 'information'::text])))
);
alter table public.aides enable row level security;

-- Table comptes
create table if not exists public.comptes (
  auth_user_id uuid not null,
  etudiant_id uuid,
  prenom text,
  email text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  profil_saisi jsonb not null default '{}'::jsonb,
  situation jsonb,
  questionnaire jsonb not null default '{}'::jsonb,
  constraint comptes_pkey PRIMARY KEY (auth_user_id)
);
alter table public.comptes enable row level security;

-- Table demandes_h_sessions
create table if not exists public.demandes_h_sessions (
  id uuid not null default gen_random_uuid(),
  session_id text not null,
  etudiant_id uuid,
  aide_code text not null,
  agent text not null,
  lien_public text,
  created_at timestamp with time zone not null default now(),
  constraint demandes_h_sessions_session_id_key UNIQUE (session_id),
  constraint demandes_h_sessions_pkey PRIMARY KEY (id)
);
alter table public.demandes_h_sessions enable row level security;

-- Table demarches
create table if not exists public.demarches (
  id uuid not null default gen_random_uuid(),
  etudiant_id uuid not null,
  aide_code text not null,
  eligibilite text not null,
  raison_eligibilite text,
  montant_estime numeric,
  cochee boolean not null default false,
  niveau text not null,
  statut text not null default 'proposee'::text,
  resultat_agent jsonb,
  checklist jsonb,
  documents_generes jsonb,
  valide_le timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint demarches_etudiant_id_aide_code_key UNIQUE (etudiant_id, aide_code),
  constraint demarches_pkey PRIMARY KEY (id),
  constraint demarches_eligibilite_check CHECK ((eligibilite = ANY (ARRAY['eligible'::text, 'peut_etre'::text, 'non_concerne'::text]))),
  constraint demarches_niveau_check CHECK ((niveau = ANY (ARRAY['automatisee'::text, 'guidee'::text, 'information'::text]))),
  constraint demarches_statut_check CHECK ((statut = ANY (ARRAY['proposee'::text, 'en_cours'::text, 'connexion_requise'::text, 'pret_a_valider'::text, 'envoyee'::text, 'guidee_a_faire'::text, 'bloquee'::text, 'abandonnee'::text])))
);
alter table public.demarches enable row level security;
CREATE INDEX demarches_etudiant_idx ON public.demarches USING btree (etudiant_id);
CREATE INDEX demarches_aide_idx ON public.demarches USING btree (aide_code);

-- Table documents
create table if not exists public.documents (
  id uuid not null default gen_random_uuid(),
  etudiant_id uuid not null,
  ref_jeu_de_test text,
  type text not null,
  fichier_url text,
  statut text not null default 'depose'::text,
  champs_extraits jsonb,
  modele text,
  duree_extraction_s numeric,
  photo_supprimee_le timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  anomalies jsonb not null default '[]'::jsonb,
  constraint documents_pkey PRIMARY KEY (id),
  constraint documents_statut_check CHECK ((statut = ANY (ARRAY['depose'::text, 'extrait'::text, 'verifie'::text, 'rejete'::text, 'erreur'::text]))),
  constraint documents_type_check CHECK ((type = ANY (ARRAY['piece_identite'::text, 'bail'::text, 'certificat_scolarite'::text, 'avis_imposition'::text, 'fiche_paie'::text, 'quittance_loyer'::text, 'contrat_alternance'::text, 'autre'::text])))
);
alter table public.documents enable row level security;
CREATE INDEX documents_etudiant_idx ON public.documents USING btree (etudiant_id);

-- Table documents_fichiers
create table if not exists public.documents_fichiers (
  id uuid not null default gen_random_uuid(),
  document_id uuid,
  etudiant_id uuid,
  nom_fichier text,
  mime text,
  contenu_base64 text not null,
  created_at timestamp with time zone not null default now(),
  constraint documents_fichiers_pkey PRIMARY KEY (id)
);
alter table public.documents_fichiers enable row level security;
CREATE INDEX documents_fichiers_document_idx ON public.documents_fichiers USING btree (document_id);

-- Table etudiants
create table if not exists public.etudiants (
  id uuid not null default gen_random_uuid(),
  persona_ref text,
  nom text not null,
  prenom text not null,
  date_naissance date,
  nationalite text,
  email text,
  etablissement text,
  formation text,
  ville_etudes text,
  adresse_logement text,
  type_logement text,
  logement_conventionne boolean,
  loyer_hors_charges numeric,
  charges numeric,
  situation_pro text,
  consentement_analyse boolean not null default false,
  consentement_le timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  ressources_12_mois numeric,
  boursier boolean,
  telephone text,
  lieu_naissance text,
  email_demarches text,
  questionnaire_reponses jsonb not null default '{}'::jsonb,
  code_postal text,
  constraint etudiants_pkey PRIMARY KEY (id)
);
alter table public.etudiants enable row level security;

-- Table logement_h_sessions
create table if not exists public.logement_h_sessions (
  id uuid not null default gen_random_uuid(),
  session_id text not null,
  etudiant_id uuid,
  demande jsonb,
  created_at timestamp with time zone not null default now(),
  constraint logement_h_sessions_session_id_key UNIQUE (session_id),
  constraint logement_h_sessions_pkey PRIMARY KEY (id)
);
alter table public.logement_h_sessions enable row level security;

-- Table matching_h
create table if not exists public.matching_h (
  etudiant_id uuid not null,
  statut text not null default 'a_lancer'::text,
  demande_le timestamp with time zone not null default now(),
  session_id text,
  lance_le timestamp with time zone,
  termine_le timestamp with time zone,
  erreur text,
  resultat jsonb,
  constraint matching_h_pkey PRIMARY KEY (etudiant_id),
  constraint matching_h_statut_check CHECK ((statut = ANY (ARRAY['a_lancer'::text, 'en_cours'::text, 'termine'::text, 'erreur'::text])))
);
alter table public.matching_h enable row level security;

-- Table passages_agents
create table if not exists public.passages_agents (
  id uuid not null default gen_random_uuid(),
  demarche_id uuid,
  etudiant_id uuid,
  site text not null,
  agent text not null default 'h/web-surfer-flash'::text,
  session_id text,
  statut text not null,
  debut timestamp with time zone not null default now(),
  fin timestamp with time zone,
  duree_s numeric,
  credits numeric,
  resultat jsonb,
  montant_lu numeric,
  montant_attendu numeric,
  etape_bloquante text,
  erreur text,
  constraint passages_agents_pkey PRIMARY KEY (id),
  constraint passages_agents_statut_check CHECK ((statut = ANY (ARRAY['completed'::text, 'failed'::text, 'timed_out'::text, 'interrupted'::text, 'erreur'::text])))
);
alter table public.passages_agents enable row level security;
CREATE INDEX passages_etudiant_idx ON public.passages_agents USING btree (etudiant_id);
CREATE INDEX passages_demarche_idx ON public.passages_agents USING btree (demarche_id);
CREATE INDEX passages_site_idx ON public.passages_agents USING btree (site);


-- Clés étrangères (après la création de toutes les tables)
alter table public.comptes add constraint comptes_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.comptes add constraint comptes_etudiant_id_fkey FOREIGN KEY (etudiant_id) REFERENCES etudiants(id) ON DELETE SET NULL;
alter table public.demandes_h_sessions add constraint demandes_h_sessions_etudiant_id_fkey FOREIGN KEY (etudiant_id) REFERENCES etudiants(id) ON DELETE SET NULL;
alter table public.demarches add constraint demarches_aide_code_fkey FOREIGN KEY (aide_code) REFERENCES aides(code);
alter table public.demarches add constraint demarches_etudiant_id_fkey FOREIGN KEY (etudiant_id) REFERENCES etudiants(id) ON DELETE CASCADE;
alter table public.documents add constraint documents_etudiant_id_fkey FOREIGN KEY (etudiant_id) REFERENCES etudiants(id) ON DELETE CASCADE;
alter table public.documents_fichiers add constraint documents_fichiers_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
alter table public.documents_fichiers add constraint documents_fichiers_etudiant_id_fkey FOREIGN KEY (etudiant_id) REFERENCES etudiants(id) ON DELETE CASCADE;
alter table public.logement_h_sessions add constraint logement_h_sessions_etudiant_id_fkey FOREIGN KEY (etudiant_id) REFERENCES etudiants(id) ON DELETE SET NULL;
alter table public.matching_h add constraint matching_h_etudiant_id_fkey FOREIGN KEY (etudiant_id) REFERENCES etudiants(id) ON DELETE CASCADE;
alter table public.passages_agents add constraint passages_agents_demarche_id_fkey FOREIGN KEY (demarche_id) REFERENCES demarches(id) ON DELETE SET NULL;
alter table public.passages_agents add constraint passages_agents_etudiant_id_fkey FOREIGN KEY (etudiant_id) REFERENCES etudiants(id) ON DELETE SET NULL;

-- Vue, fonctions et déclencheurs
create or replace view public.mesures_agents as
-- Un passage est réussi s'il est terminé, ou si l'agent a obtenu le résultat du simulateur
-- puis s'est arrêté volontairement avant l'envoi (« Simulation faite », « Pas de bourse »).
-- Les passages de test (durée négative) sont exclus.
 WITH p AS (
         SELECT passages_agents.*,
            ((statut = 'completed'::text) OR (COALESCE(erreur, etape_bloquante, ''::text) ~~* 'Simulation faite%'::text) OR (COALESCE(erreur, etape_bloquante, ''::text) ~~* 'Pas de bourse%'::text)) AS reussi
           FROM passages_agents
          WHERE ((duree_s IS NULL) OR (duree_s >= (0)::numeric))
        )
 SELECT site,
    count(*) AS essais,
    count(*) FILTER (WHERE reussi) AS reussis,
    round(((100.0 * ((count(*) FILTER (WHERE reussi)))::numeric) / (count(*))::numeric), 1) AS taux_reussite_pct,
    round(avg(duree_s) FILTER (WHERE reussi), 1) AS duree_moyenne_s,
    round(avg(credits), 4) AS credits_moyens,
    count(*) FILTER (WHERE ((montant_lu IS NOT NULL) AND (montant_attendu IS NOT NULL) AND (abs((montant_lu - montant_attendu)) <= (1)::numeric))) AS montants_justes
   FROM p
  GROUP BY site;

CREATE OR REPLACE FUNCTION public.demander_matching_h()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
  if tg_table_name = 'documents' then
    if tg_op = 'DELETE' then
      v_id := old.etudiant_id;
    else
      v_id := new.etudiant_id;
    end if;
  else
    v_id := new.id;
  end if;
  if coalesce((select consentement_analyse from public.etudiants where id = v_id), false) then
    insert into public.matching_h (etudiant_id, statut, demande_le)
    values (v_id, 'a_lancer', now())
    on conflict (etudiant_id) do update set statut = 'a_lancer', demande_le = now(), erreur = null;
  end if;
  return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.supprimer_photos_anciennes()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with supprimees as (
    delete from public.documents_fichiers
    where created_at < now() - interval '30 days'
    returning document_id
  )
  update public.documents d set photo_supprimee_le = now(), fichier_url = null
  from supprimees s where d.id = s.document_id;
$function$
;

CREATE TRIGGER demander_matching_h_documents AFTER INSERT OR DELETE OR UPDATE OF statut, champs_extraits, anomalies ON public.documents FOR EACH ROW EXECUTE FUNCTION demander_matching_h();

CREATE TRIGGER demander_matching_h_etudiants AFTER INSERT OR UPDATE OF date_naissance, nationalite, formation, situation_pro, boursier, loyer_hors_charges, charges, ressources_12_mois, type_logement, logement_conventionne, consentement_analyse ON public.etudiants FOR EACH ROW EXECUTE FUNCTION demander_matching_h();

-- Tâches planifiées (extensions pg_cron et pg_net à activer dans Supabase)
select cron.schedule('passerelle-supprimer-photos', '17 3 * * *', 'select public.supprimer_photos_anciennes()');
select cron.schedule('matching-h', '* * * * *', ' select net.http_post(
       url := ''https://hnziztstifpipxrgdnop.supabase.co/functions/v1/matching-h'',
       headers := ''{"Content-Type": "application/json"}''::jsonb,
       body := ''{}''::jsonb,
       timeout_milliseconds := 10000
     ) where exists (select 1 from public.matching_h where statut in (''a_lancer'', ''en_cours'')); ');
