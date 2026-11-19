# Base Supabase de Passerelle

Export du projet Supabase `hnziztstifpipxrgdnop`, fait le 19/11/2026. **Aucune donnée d'étudiant** n'est incluse : seulement la structure et le catalogue des aides.

- `schema.sql` : tables, contraintes, clés étrangères, sécurité par ligne (RLS activée, aucune politique : seules les fonctions avec la clé de service lisent et écrivent), vue `mesures_agents`, fonctions, déclencheurs et tâches planifiées (pg_cron + pg_net).
- `donnees-reference.sql` : catalogue des aides (table `aides`).
- `functions/` : code des Edge Functions (Deno), toutes déployées avec `verify_jwt = false` :
  - `compte` : compte de l'étudiant (profil, situation, questionnaire, liaison au dossier, photos) ;
  - `etat` : état d'un dossier (démarches et documents) pour l'interface ;
  - `demande-h` : agents H de demande Visale et Mobili-Jeune (secret `H_API_KEY_DEMANDES`) ;
  - `logement-h` : agent H de recherche de logement (secret `H_API_KEY`) ;
  - `matching-h` : agent H de matching des aides, appelé chaque minute par pg_cron (secret `H_API_KEY`).

## Recréer la base

1. Dans le SQL Editor : activer les extensions `pg_cron` et `pg_net`, puis exécuter `schema.sql`, puis `donnees-reference.sql`.
2. Dans `schema.sql`, la tâche `matching-h` appelle l'adresse du projet actuel : la remplacer par celle du nouveau projet.
3. Déployer chaque dossier de `functions/` (`supabase functions deploy <nom> --no-verify-jwt`) et ajouter les secrets H dans Edge Functions → Secrets.
4. Authentication : fournisseur E-mail, mot de passe de 8 caractères minimum, adresse du site dans les URL de redirection (`/connexion`).
