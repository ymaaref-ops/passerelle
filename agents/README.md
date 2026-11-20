# Agents H Company

Chaque fichier contient la configuration complète d'un agent, à recopier sur [platform.hcompany.ai](https://platform.hcompany.ai) → **Agents → Créer** : détails, environnement, format JSON, instructions, compétences, sous-agents et tâche de test.

| Agent | Type | Lancé par | Statut |
|---|---|---|---|
| [simulateur-apl-caf](simulateur-apl-caf.md) | simulation sur caf.fr, sans connexion | n8n, workflow 2 | ✅ |
| [simulateur-prime-activite-caf](simulateur-prime-activite-caf.md) | simulation sur caf.fr, sans connexion | n8n, workflow 2 | ✅ |
| [simulateur-bourse](simulateur-bourse.md) | simulation Crous (bourse sur critères sociaux) | n8n, workflow 2 | ✅ |
| [comparateur-pret](comparateur-pret.md) | agent chef : compare les banques, délègue au simulateur | n8n, workflow 2 | ✅ |
| [simulateur-pret-etudiant](simulateur-pret-etudiant.md) | sous-agent : simulation sur le site d'une banque | comparateur-pret | ✅ |
| [demande-apl-caf](demande-apl-caf.md) | démarche sur l'espace caf.fr, coffre-fort + code e-mail | n8n, workflow 6 | ✅ |
| [demande-prime-activite-caf](demande-prime-activite-caf.md) | démarche sur l'espace caf.fr + « JE VALIDE » | test direct sur la plateforme | ✅ |

Résultats mesurés sur 60 passages réels : voir le [README principal](../README.md#résultats-mesurés).

## Réglages communs

- **Coffre-fort** `passerelle-demo` (fournisseur H Company), un élément par site avec son URL de connexion.
- **Environnement** `web-passerelle` : navigateur visuel, markdown activé, coffre-fort associé, sans proxy.
- **Créer un nouvel agent** : partir de la fiche la plus proche, garder les règles absolues, tester d'abord avec un profil fictif complet (aucun champ entre crochets), puis répondre NON à la validation.

## Ce que les tests ont appris

- l'agent ne voit **que le message de la session** : n8n ou Vercel doit y écrire toutes les informations de l'étudiant ;
- une valeur inconnue comptée à 0 € a fait refuser la prime d'activité à tort → règle « jamais 0 par défaut » ;
- le simulateur prime d'activité demande le **dernier trimestre civil complet** et le **montant net social** ;
- un agent a recopié le code e-mail dans son récapitulatif → règle qui l'interdit ;
- le chef comparateur bouclait en attendant ses sous-agents → banques traitées une par une, réponse finale immédiate ;
- les sous-agents `h/web-surfer-*` ne reçoivent pas la tâche d'origine → aucun sous-agent pour les simulateurs.
