"""Prompts finaux de Passerelle pour la lecture des documents (Hugging Face).

Un prompt par type de document. Chaque réponse du modèle a toujours la même forme :
    {"lisibilite": {"complete": bool, "probleme": str|None},
     "champs": {...},
     "anomalies": [str, ...]}

Ce fichier est utilisé par evaluer_modeles.py. Les mêmes textes sont à copier
dans les nœuds Hugging Face de n8n (workflow « 1. Dépôt et analyse »).
"""

CONSIGNES_COMMUNES = """Réponds uniquement en JSON, avec exactement trois clés : lisibilite, champs, anomalies.

- lisibilite : {"complete": true ou false, "probleme": null ou une phrase courte}.
  Mets complete à false si la photo est floue, a un reflet, ou si une partie du document est coupée.
  Vérifie en particulier que chaque ligne de texte va jusqu'au bout et qu'aucun mot n'est coupé au bord de la photo.
- champs : les informations listées ci-dessous, avec exactement ces noms de clés.
  Mets null si une information est absente, illisible ou coupée. Ne la complète jamais et ne la devine jamais.
  Montants : nombres sans espace ni symbole € (ex. 1250.5). Dates : JJ/MM/AAAA. Mois : MM/AAAA.
- anomalies : uniquement les vrais problèmes visibles sur CE document (erreur de calcul, date dépassée, information obligatoire absente).
  N'y mets jamais une vérification réussie. Ne donne aucun avis sur l'éligibilité aux aides : ce n'est pas ton rôle.
  Liste vide s'il n'y a aucun problème.

Ce document est un document de test : ignore les mentions « spécimen » ou « document de test », ce ne sont pas des anomalies."""

CHAMPS = {
    "avis_imposition": (
        "d'un avis d'imposition français",
        "declarants, adresse (adresse complète du foyer fiscal), annee_revenus, annee_avis, "
        "nombre_parts, revenu_brut_global, revenu_fiscal_reference, impot_net",
    ),
    "piece_identite": (
        "d'une pièce d'identité",
        "nom, prenom, sexe, nationalite, date_naissance, lieu_naissance, numero_document, date_expiration",
    ),
    "bail": (
        "d'un bail de location",
        "locataires (liste de noms), adresse_logement (numéro, rue, code postal et ville), bailleur, "
        "type_logement, meuble (true/false), colocation (true/false, null si impossible à savoir), "
        "nombre_occupants (null si non écrit), surface_m2, loyer_hors_charges, charges, date_entree, duree_bail",
    ),
    "certificat_scolarite": (
        "d'un certificat de scolarité",
        "etablissement, nom, prenom, date_naissance, formation, annee_universitaire, date_document",
    ),
    "fiche_paie": (
        "d'une fiche de paie",
        "salarie, employeur, periode (MM/AAAA), type_contrat, salaire_brut, "
        "montant_net_social (ligne « Montant net social », null si elle n'apparaît pas), net_a_payer",
    ),
    "quittance": (
        "d'une quittance de loyer",
        "locataire, bailleur, adresse_logement (numéro, rue, code postal et ville), periode (MM/AAAA), "
        "loyer_hors_charges, charges, total_paye, date_document",
    ),
}


def prompt_pour(type_document: str) -> str:
    """Renvoie le prompt complet pour un type de document."""
    description, champs = CHAMPS[type_document]
    return (
        f"Voici la photo {description}.\n\n"
        f"Champs à extraire : {champs}.\n\n"
        f"{CONSIGNES_COMMUNES}"
    )


PROMPT_BILAN = """Voici les informations extraites de tous les documents d'un étudiant, puis la liste des anomalies trouvées par nos règles de contrôle.
Nous sommes en {mois_courant}.

Rédige un bilan court et bienveillant pour l'étudiant, en français simple.
- Reprends chaque anomalie en une phrase claire, avec l'action concrète à faire (quel document refaire ou demander, à qui).
- N'ajoute aucune anomalie qui n'est pas dans la liste.
- Ne donne aucune règle d'éligibilité aux aides et ne promets aucun montant.
- Les revenus d'un job étudiant ou d'une alternance ne sont jamais un problème.
- Ne conseille jamais de retirer, de cacher ou de modifier un document.
Réponds uniquement en JSON avec les clés : dossier_complet (true/false), message_etudiant, actions_a_faire (liste).

Informations extraites :
{documents}

Anomalies trouvées par les règles :
{anomalies}"""
