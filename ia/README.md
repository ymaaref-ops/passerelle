# IA documentaire (Hugging Face)

Lecture des photos de documents par un modèle de vision, puis contrôle croisé du dossier.

| Fichier | Contenu |
|---|---|
| [prompts_passerelle.py](prompts_passerelle.py) | prompts finaux : un par type de document (pièce d'identité, bail, certificat de scolarité, avis d'imposition, fiche de paie, quittance) + prompt du bilan de dossier |
| [evaluer_modeles.py](evaluer_modeles.py) | script qui envoie chaque document spécimen à plusieurs modèles et compare leurs réponses aux bonnes réponses |
| [bonnes_reponses.csv](bonnes_reponses.csv) | bonnes réponses des 20 documents spécimens (3 étudiants fictifs, 158 champs) |

Le prompt utilisé en production est dans le nœud « Découper les photos » du [workflow n8n 1](../n8n/1-depot-et-analyse.json) ; les règles de contrôle croisé sont dans le nœud « Lire les anomalies ».

## Résultats de l'évaluation

3 modèles testés via Hugging Face Inference Providers, sur 38 champs et anomalies vérifiés à la main :

| Modèle | Réponses justes | Anomalies détectées | Photo coupée repérée | Coût / document | Choix |
|---|---|---|---|---|---|
| **Qwen/Qwen3.8-27B** | **38/38 (100 %)** | 3/3 | ✅ | ≈ 0,002 $ | **retenu, branché dans n8n** |
| Qwen/Qwen3.5-9B | 37/38 (97 %) | 3/3 | ✅ | ≈ 0,001 $ | non retenu (règles CAF inventées) |
| Qwen/Qwen3-VL-235B-A22B-Instruct | 36/38 (95 %) | 2/3 | ❌ | ≈ 0,0007 $ | secours (utilisé au début du prototype) |

Un dossier de 6 documents coûte environ **0,012 $** de lecture avec Qwen3.8-27B.

## Ce qu'on a appris

- Les modèles **lisent** très bien et **comparent** bien les documents (adresse « 14 rue » sur le bail contre « 16 rue » sur la quittance, repérée par les trois).
- Ils **jugent mal le droit des aides** (règles CAF inventées, job étudiant pris pour une anomalie) : l'éligibilité est donc calculée par des **règles écrites dans le code**, jamais par le modèle.
- La **lisibilité** doit être demandée explicitement : un modèle a jugé « complète » une photo coupée.
- Un modèle a conseillé de « retirer le bulletin de salaire » : consigne ajoutée, « ne conseille jamais de retirer ou de cacher un document ».

## Reproduire l'évaluation

```bash
cd ia
pip install requests
export HF_TOKEN="hf_..."   # token Hugging Face avec la permission « Inference Providers »
python evaluer_modeles.py --dossier "/chemin/vers/documents-specimens" \
  --modeles Qwen/Qwen3.8-27B Qwen/Qwen3.5-9B Qwen/Qwen3-VL-235B-A22B-Instruct \
  --bonnes-reponses bonnes_reponses.csv --sortie resultats.csv
```

Le script écrit `resultats.csv` (une ligne par champ et par modèle) et `reponses_brutes.jsonl`. Tous les documents utilisés sont fictifs et marqués « SPÉCIMEN ».
