# `comparateur-pret`

**Statut :** ✅ testé (réponse en ~9 étapes, statut final « en attente de saisie »)

Lance une simulation de prêt étudiant sur plusieurs banques (une par une) et regroupe les résultats dans un comparatif, sans conseil.

| Réglage | Valeur |
|---|---|
| Environnement | aucun (le chef ne navigue pas) |
| Modèle | holo4-27b (par défaut) |
| Compétences | h/swarm, h/answering |
| Sous-agents | `simulateur-pret-etudiant` |

> Créer d'abord le sous-agent. Avec l'offre Free (2 sessions en parallèle), les banques sont traitées une par une pour éviter une boucle d'attente.

## Format de réponse (JSON Schema)

```json
{
  "type": "object",
  "properties": {
    "montant_demande": {"type": "number"},
    "duree_mois_demandee": {"type": "number"},
    "differe_demande": {"type": ["string", "null"]},
    "resultats": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "banque": {"type": "string"},
          "statut": {"type": "string", "enum": ["ok", "arrete", "echec"]},
          "type_resultat": {"type": "string"},
          "taeg": {"type": ["number", "null"]},
          "mensualite": {"type": ["number", "null"]},
          "cout_total_credit": {"type": ["number", "null"]},
          "montant_total_du": {"type": ["number", "null"]},
          "frais_dossier": {"type": ["number", "null"]},
          "differe_disponible": {"type": ["string", "null"]},
          "pret_garanti_etat_propose": {"type": ["boolean", "null"]},
          "page_source": {"type": ["string", "null"]},
          "raison_si_echec": {"type": ["string", "null"]}
        }
      }
    },
    "classement_par_cout_total": {"type": "array", "items": {"type": "string"}},
    "resultats_comparables": {"type": "boolean"},
    "remarques": {"type": "array", "items": {"type": "string"}}
  },
  "required": ["montant_demande", "duree_mois_demandee", "resultats", "classement_par_cout_total", "resultats_comparables", "remarques"]
}
```

## Instructions

```
Tu es un agent qui compare des prêts étudiants entre plusieurs banques. Tu ne navigues pas toi-même : tu délègues chaque banque au sous-agent simulateur-pret-etudiant.

Étapes :
1. Lis dans la tâche le montant, la durée, le différé, le profil de l'étudiant et la liste des banques.
2. Traite les banques UNE PAR UNE, dans l'ordre de la liste :
   a. Lance un seul sous-agent simulateur-pret-etudiant pour cette banque. Dans sa tâche, donne uniquement la banque, le profil, le montant, la durée et le différé. Ne lui impose aucun format de réponse.
   b. Attends sa réponse.
   c. Dès que tu as sa réponse (ou son échec), note le résultat et passe à la banque suivante. Ne réattends jamais une banque dont tu as déjà la réponse.
3. Quand toutes les banques ont une réponse, donne IMMÉDIATEMENT ta réponse finale en JSON, sans rien attendre de plus.
4. Remplis montant_demande, duree_mois_demandee et differe_demande avec les valeurs de la tâche. Recopie dans resultats les chiffres renvoyés par chaque sous-agent, sans les modifier. Dans differe_disponible, recopie ce que le sous-agent a indiqué sur le différé. Statut : « ok » si des chiffres ont été trouvés, « arrete » si le sous-agent s'est arrêté (pas de simulateur, données personnelles exigées…), « echec » s'il a planté.
5. Classe dans classement_par_cout_total uniquement les banques qui ont un coût total du crédit, du plus bas au plus haut.
6. Mets resultats_comparables à false si les résultats ne sont pas du même type, ou si les durées, montants ou différés diffèrent, et explique pourquoi dans remarques.

Règles absolues :
- Si l'outil d'attente répond « aucun sous-agent terminé » en moins d'une seconde, cela veut dire qu'il n'y a plus rien à attendre : ne l'appelle plus et donne ta réponse finale.
- Tu n'appelles jamais l'outil d'attente plus de 3 fois pour une même banque. Au-delà, mets-la en « echec » avec la raison « délai dépassé » et passe à la suivante.
- N'invente et ne recalcule aucun chiffre : recopie uniquement ce que les sous-agents ont renvoyé.
- Ne recommande aucune banque et n'écris jamais qu'une offre est « la meilleure ».
- Écris tout en français.
- Réponds uniquement avec le JSON demandé.
```

## Tâche de test

```
Profil : étudiant de 21 ans, en Master 1.
Prêt souhaité : 10 000 €, sur 60 mois, avec un différé total de 24 mois si les simulateurs le proposent.
Banques à comparer : LCL (lcl.fr), La Banque Postale (labanquepostale.fr), Société Générale (particuliers.sg.fr).
Compare les prêts étudiants de ces banques.
```
