# Workflows n8n de Passerelle

Exports des workflows de l'instance n8n Cloud **ema9998989.app.n8n.cloud**, faits le 19/11/2026.
Ils sont enregistrés désactivés (`"active": false`). Les accès (credentials) ne sont pas inclus : seul leur nom est gardé.

| Fichier | Rôle | Adresse appelée par le site |
|---|---|---|
| `1-depot-et-analyse.json` | Reçoit les photos ou PDF, les fait lire par Hugging Face (Qwen/Qwen3.8-27B), contrôle croisé, profil, éligibilité | `POST /webhook/passerelle/depot` |
| `2-lancer-les-demarches.json` | Marque les aides cochées et confie chaque démarche automatisée à un agent H (APL, prime d'activité, bourse, prêts) | `POST /webhook/passerelle/lancer` |
| `3-retour-des-agents.json` | Reçoit le résultat d'un agent, met à jour la démarche, envoie l'e-mail « dossier prêt » | `POST /webhook/passerelle/resultat-agent` |
| `5-agent-h-lanceur.json` | Sous-workflow : lance une session H, la partage, attend la fin et renvoie le résultat au workflow 3 | appelé par le workflow 2 |
| `6-demande-apl-caf.json` | Prépare la vraie demande d'APL avec l'agent `demande-apl-caf` (s'arrête au récapitulatif), réponses et refus | `POST /webhook/passerelle/demande-caf` |

Le workflow 4 (état du dossier) n'existe plus : l'état est lu par la fonction Supabase `etat`.

## Réimporter

1. Importer les fichiers dans n8n (Workflows → Import from file), en commençant par le 5.
2. Dans le workflow 2, nœuds « Confier à l'agent H » et « Lancer le comparateur » : choisir le workflow 5 importé.
3. Dans les workflows 2 et 3, remplacer `ema9998989.app.n8n.cloud` par l'adresse de la nouvelle instance (adresse de retour des agents).
4. Créer les accès et les choisir sur chaque nœud :
   - **Supabase account** (Supabase OAuth2 API) : nœuds Supabase ;
   - **Clé Hugging Face** (Bearer Auth) : « Lire les documents » et « Contrôle croisé » ;
   - **Clé H** (Bearer Auth, espace H qui contient les agents) : nœuds HTTP vers agp.eu.hcompany.ai ;
   - **SMTP account** : nœud « Email « dossier prêt » ».
5. Publier dans l'ordre 5, 3, 1, 2, 6.
