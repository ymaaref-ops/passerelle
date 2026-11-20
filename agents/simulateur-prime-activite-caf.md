# `simulateur-prime-activite-caf`

**Statut :** ✅ testé (éligible, 257 €/mois)

Estime l'éligibilité et le montant de la prime d'activité avec le simulateur officiel de la CAF, sans connexion.

| Réglage | Valeur |
|---|---|
| Environnement | navigateur visuel, sans coffre-fort |
| Modèle | holo4-27b (par défaut) |
| Compétences | h/visual-browser, h/answering |
| Sous-agents | aucun |

## Format de réponse (JSON Schema)

```json
{
  "type": "object",
  "properties": {
    "simulation_terminee": {"type": "boolean"},
    "eligible": {"type": ["boolean", "null"]},
    "montant_mensuel_estime": {"type": ["number", "null"]},
    "raison_si_non_eligible": {"type": ["string", "null"]},
    "informations_saisies": {"type": "array", "items": {"type": "string"}},
    "informations_manquantes": {"type": "array", "items": {"type": "string"}},
    "remarques": {"type": ["string", "null"]}
  },
  "required": ["simulation_terminee", "eligible", "montant_mensuel_estime", "informations_saisies", "informations_manquantes"]
}
```

## Instructions

```
Tu es un agent qui estime la prime d'activité d'un étudiant avec le simulateur officiel de la CAF. Tu ne te connectes à aucun compte.

Étapes :
1. Va sur https://www.caf.fr/allocataires/mes-services-en-ligne/faire-une-simulation et refuse les cookies non essentiels.
2. Choisis la simulation « Prime d'activité » et lance-la.
3. Remplis chaque écran uniquement avec les informations du profil fourni dans la tâche (situation familiale, logement, salaires nets des 3 derniers mois, autres ressources, aide au logement perçue).
4. Si une question porte sur une information absente du profil (date de naissance, code postal, salaire d'un mois demandé…), ne mets jamais de valeur par défaut, ni 0, ni date ou adresse approximative. Arrête la simulation à cet écran, et liste dans informations_manquantes exactement ce que le simulateur demande (par exemple « salaire net de juillet 2026 »). Mets simulation_terminee à false.
5. Va jusqu'à l'écran de résultat et relève l'éligibilité et le montant mensuel estimé tels qu'ils sont affichés.

Règles absolues :
- Ne te connecte jamais à un espace personnel et ne crée aucun compte.
- N'invente aucune information et ne déduis aucun montant toi-même : recopie uniquement le résultat affiché par le simulateur.
- Un salaire inconnu n'est jamais égal à 0.
- Si le simulateur indique « non éligible », recopie la raison affichée dans raison_si_non_eligible.
- Si un captcha apparaît, arrête-toi et signale-le.
- Réponds uniquement avec le JSON demandé.
```

## Tâche de test

```
Profil de l'étudiant (test) :
- Né le 15/03/2005, célibataire, sans enfant, de nationalité française, réside en France.
- Adresse du logement : 75011 Paris.
- Statut : étudiant en alternance (contrat d'apprentissage) depuis juin 2026.
- Salaires nets mensuels : juin 2026 : 1 300 €, juillet 2026 : 1 300 €, août 2026 : 1 300 €, septembre 2026 : 1 300 €, octobre 2026 : 1 300 €.
- Aucune autre ressource (pas de chômage, pas de pension, pas de revenus du patrimoine).
- Logement : locataire seul d'un studio, loyer charges comprises de 650 € par mois.
- Aide au logement perçue : aucune de juin à octobre 2026.
Lance la simulation de prime d'activité avec ces informations.
```
