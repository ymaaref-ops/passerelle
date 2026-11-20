"""Évalue plusieurs modèles de vision Hugging Face sur les documents spécimens de Passerelle.

Pour chaque image, le script :
  1. devine le type de document d'après le nom du fichier ;
  2. envoie la photo et le prompt final (prompts_passerelle.py) à chaque modèle ;
  3. compare les champs extraits aux bonnes réponses (bonnes_reponses.csv) ;
  4. note le temps de réponse, les tokens et le coût s'il est renvoyé.

Utilisation (dans un terminal, depuis le dossier de ce script) :
    pip install requests
    export HF_TOKEN="hf_..."           # token Hugging Face avec la permission « Inference Providers »
    python evaluer_modeles.py --dossier "/chemin/vers/03_Documents"

Options utiles :
    --modeles Qwen/Qwen3.8-27B Qwen/Qwen3-VL-235B-A22B-Instruct
    --bonnes-reponses bonnes_reponses.csv
    --sortie resultats.csv

Résultats :
    resultats.csv : une ligne par document, modèle et champ (valeur lue, bonne réponse, juste ou non)
    reponses_brutes.jsonl : la réponse complète de chaque appel, pour vérifier à la main
    + un résumé par modèle affiché à la fin (précision, photos coupées repérées, temps, coût).

N'utilise que des documents fictifs marqués SPÉCIMEN : jamais de vrais documents.
"""

import argparse
import base64
import csv
import json
import mimetypes
import os
import re
import sys
import time
import unicodedata
from pathlib import Path

import requests

from prompts_passerelle import prompt_pour

URL_HF = "https://router.huggingface.co/v1/chat/completions"
MODELES_PAR_DEFAUT = [
    "Qwen/Qwen3.8-27B",
    "Qwen/Qwen3.5-9B",
    "Qwen/Qwen3-VL-235B-A22B-Instruct",
]
EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}

# Mots du nom de fichier -> type de document (même noms que dans les prompts).
TYPES_PAR_MOT = [
    ("identite", "piece_identite"),
    ("avis", "avis_imposition"),
    ("bail", "bail"),
    ("certificat", "certificat_scolarite"),
    ("paie", "fiche_paie"),
    ("quittance", "quittance"),
]


# ---------------------------------------------------------------- lecture des fichiers

def type_du_fichier(nom: str) -> str | None:
    n = sans_accents(nom).lower()
    for mot, type_doc in TYPES_PAR_MOT:
        if mot in n:
            return type_doc
    return None


def image_en_data_url(chemin: Path) -> str:
    mime = mimetypes.guess_type(chemin.name)[0] or "image/png"
    donnees = base64.b64encode(chemin.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{donnees}"


def lire_bonnes_reponses(chemin: Path) -> dict:
    """Renvoie {(etudiant, fichier): {champ: bonne_reponse}}."""
    reponses: dict = {}
    if not chemin.exists():
        print(f"(Pas de fichier {chemin.name} : le script lira les documents sans calculer la précision.)")
        return reponses
    with chemin.open(encoding="utf-8") as f:
        for ligne in csv.DictReader(f):
            cle = (ligne["etudiant"].strip(), ligne["fichier"].strip())
            reponses.setdefault(cle, {})[ligne["champ"].strip()] = ligne["bonne_reponse"].strip()
    return reponses


# ---------------------------------------------------------------- appel du modèle

def appeler_modele(modele: str, prompt: str, image: str, token: str) -> dict:
    corps = {
        "model": modele,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": image}},
            ],
        }],
        "response_format": {"type": "json_object"},
        "temperature": 0,
    }
    debut = time.time()
    r = requests.post(URL_HF, headers={"Authorization": f"Bearer {token}"}, json=corps, timeout=180)
    duree = time.time() - debut
    if r.status_code != 200:
        return {"erreur": f"HTTP {r.status_code} : {r.text[:300]}", "duree_s": duree}
    reponse = r.json()
    texte = reponse["choices"][0]["message"].get("content") or ""
    usage = reponse.get("usage", {}) or {}
    return {
        "texte": texte,
        "json": extraire_json(texte),
        "duree_s": duree,
        "tokens": usage.get("total_tokens"),
        "cout": usage.get("cost"),  # présent seulement si le fournisseur le renvoie
        "brut": reponse,
    }


def extraire_json(texte: str):
    """Lit le JSON même s'il est entouré de ```json ... ```."""
    t = texte.strip()
    t = re.sub(r"^```(?:json)?\s*|\s*```$", "", t)
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", t, re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except json.JSONDecodeError:
                return None
    return None


# ---------------------------------------------------------------- comparaison

def sans_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def normaliser(valeur) -> str:
    """Met une valeur sous une forme comparable (texte, nombre, date, booléen, null)."""
    if valeur is None:
        return "null"
    if isinstance(valeur, bool):
        return "true" if valeur else "false"
    if isinstance(valeur, (int, float)):
        return f"{float(valeur):.2f}"
    if isinstance(valeur, list):
        return " et ".join(normaliser(v) for v in valeur)
    s = str(valeur).strip()
    if s.lower() in {"null", "none", ""}:
        return "null"
    if s.lower() in {"true", "vrai", "oui"}:
        return "true"
    if s.lower() in {"false", "faux", "non"}:
        return "false"
    # Dates : AAAA-MM-JJ -> JJ/MM/AAAA, AAAA-MM -> MM/AAAA
    m = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        s = f"{m[3]}/{m[2]}/{m[1]}"
    m = re.fullmatch(r"(\d{4})-(\d{2})", s)
    if m:
        s = f"{m[2]}/{m[1]}"
    # Montants : "1 250,00 €" -> 1250.00
    montant = s.replace("€", "").replace(" ", "").replace(" ", "").replace(",", ".")
    if re.fullmatch(r"-?\d+(\.\d+)?", montant):
        return f"{float(montant):.2f}"
    s = sans_accents(s).lower()
    return re.sub(r"[^a-z0-9/]+", " ", s).strip()


def est_juste(lu, attendu: str) -> bool:
    return normaliser(lu) == normaliser(attendu)


# ---------------------------------------------------------------- programme principal

def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--dossier", required=True, help="Dossier 03_Documents (un sous-dossier par étudiant)")
    p.add_argument("--modeles", nargs="+", default=MODELES_PAR_DEFAUT)
    p.add_argument("--bonnes-reponses", default="bonnes_reponses.csv")
    p.add_argument("--sortie", default="resultats.csv")
    p.add_argument("--pause", type=float, default=2.0, help="Secondes d'attente entre deux appels")
    args = p.parse_args()

    token = os.environ.get("HF_TOKEN")
    if not token:
        sys.exit("Il manque le token : lance d'abord  export HF_TOKEN=\"hf_...\"")

    dossier = Path(args.dossier).expanduser()
    images = sorted(f for f in dossier.rglob("*") if f.suffix.lower() in EXTENSIONS)
    if not images:
        sys.exit(f"Aucune image trouvée dans {dossier}")
    bonnes = lire_bonnes_reponses(Path(args.bonnes_reponses))

    lignes = []
    stats = {m: {"testes": 0, "justes": 0, "coupes_attendus": 0, "coupes_vus": 0,
                 "temps": 0.0, "appels": 0, "cout": 0.0, "erreurs": 0} for m in args.modeles}

    with open("reponses_brutes.jsonl", "w", encoding="utf-8") as brut:
        for image in images:
            type_doc = type_du_fichier(image.name)
            if not type_doc:
                print(f"? Type inconnu, ignoré : {image.name}")
                continue
            etudiant = image.parent.name
            attendus = bonnes.get((etudiant, image.name), {})
            data_url = image_en_data_url(image)
            prompt = prompt_pour(type_doc)

            for modele in args.modeles:
                print(f"→ {modele} | {etudiant} | {image.name}")
                res = appeler_modele(modele, prompt, data_url, token)
                s = stats[modele]
                s["appels"] += 1
                s["temps"] += res.get("duree_s", 0)
                if res.get("cout"):
                    s["cout"] += res["cout"]
                brut.write(json.dumps({"modele": modele, "etudiant": etudiant, "fichier": image.name,
                                       **{k: v for k, v in res.items() if k != "json"}}, ensure_ascii=False) + "\n")

                if "erreur" in res or res["json"] is None:
                    s["erreurs"] += 1
                    print(f"   ✗ {res.get('erreur', 'réponse qui n’est pas du JSON')}")
                    continue

                champs = res["json"].get("champs", {}) or {}
                lisibilite = res["json"].get("lisibilite", {}) or {}

                for champ, attendu in attendus.items():
                    if champ == "_photo_complete":  # ligne spéciale : la photo est-elle complète ?
                        lu = lisibilite.get("complete")
                        s["coupes_attendus"] += normaliser(attendu) == "false"
                        juste = est_juste(lu, attendu)
                        s["coupes_vus"] += juste and normaliser(attendu) == "false"
                    else:
                        lu = champs.get(champ)
                        juste = est_juste(lu, attendu)
                    s["testes"] += 1
                    s["justes"] += juste
                    lignes.append({"modele": modele, "etudiant": etudiant, "fichier": image.name,
                                   "type": type_doc, "champ": champ,
                                   "valeur_lue": json.dumps(lu, ensure_ascii=False),
                                   "bonne_reponse": attendu, "juste": "oui" if juste else "non",
                                   "duree_s": round(res["duree_s"], 1), "cout": res.get("cout")})
                time.sleep(args.pause)

    with open(args.sortie, "w", newline="", encoding="utf-8") as f:
        colonnes = ["modele", "etudiant", "fichier", "type", "champ", "valeur_lue",
                    "bonne_reponse", "juste", "duree_s", "cout"]
        w = csv.DictWriter(f, fieldnames=colonnes)
        w.writeheader()
        w.writerows(lignes)

    print("\n=== Résumé ===")
    for modele, s in stats.items():
        precision = f"{100 * s['justes'] / s['testes']:.1f} %" if s["testes"] else "non calculée"
        temps = f"{s['temps'] / s['appels']:.1f} s" if s["appels"] else "-"
        print(f"\n{modele}")
        print(f"  Précision : {precision} ({s['justes']}/{s['testes']} champs)")
        print(f"  Photos coupées repérées : {s['coupes_vus']}/{s['coupes_attendus']}")
        print(f"  Temps moyen par document : {temps}")
        print(f"  Coût total : {s['cout']:.4f} $" if s["cout"] else "  Coût : non renvoyé par le fournisseur")
        print(f"  Réponses en erreur ou non JSON : {s['erreurs']}")
    print(f"\nDétail : {args.sortie}  |  Réponses complètes : reponses_brutes.jsonl")


if __name__ == "__main__":
    main()
