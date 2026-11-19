// Pont interface Passerelle <-> agent H « passerelle-logement » (espace de Lamyaa).
// Utilise le secret H_API_KEY déjà configuré pour matching-h. Aucune clé n'est exposée à l'interface.
// Actions (POST JSON) :
//   { action: 'lancer', demande: {...}, etudiant_id? }  -> { session_id }
//   { action: 'etat', session_id }                       -> { statut, reponse, logements, lien }
//   { action: 'repondre', session_id, message }          -> { ok: true }
// verify_jwt = false : limite d'usage (20 recherches par heure) et seules les sessions créées ici sont lisibles.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const H_BASE = Deno.env.get("H_API_BASE") ?? "https://agp.eu.hcompany.ai/api/v2";
const H_KEY = Deno.env.get("H_API_KEY") ?? "";
const AGENT = Deno.env.get("H_AGENT_LOGEMENT") ?? "passerelle-logement";
const LIMITE_PAR_HEURE = 20;

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: CORS });

async function h(path: string, init: RequestInit = {}) {
  const r = await fetch(`${H_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${H_KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`H ${r.status} : ${txt.slice(0, 200)}`);
  return txt ? JSON.parse(txt) : {};
}

const txt = (v: unknown) => (v === null || v === undefined || v === "" ? "non précisé" : String(v));

/** Consigne ajoutée à chaque recherche : l'étudiant ne peut pas agir dans la fenêtre de l'agent. */
const REGLE_ANTI_ROBOT = [
  "RÈGLE IMPORTANTE : l'étudiant ne peut ni cliquer ni taper dans ton navigateur.",
  "Si un site affiche un CAPTCHA, une vérification « Verify you are human », Cloudflare, DataDome ou toute autre protection anti-robot :",
  "n'essaie pas de la résoudre ni de la contourner, ne demande rien à l'étudiant et ne t'arrête pas.",
  "Abandonne ce site et passe tout de suite au suivant, par exemple : ImmoJeune, Studapart, Lokaviz (Crous), La Carte des Colocs, Locservice, Bien'ici, Logic-Immo, ParuVendu.",
  "Termine avec les logements trouvés sur les sites accessibles.",
  "Seulement si un site t'a vraiment bloqué, cite-le en une ligne. Si aucun site ne t'a bloqué, ne parle ni de CAPTCHA, ni de protection anti-robot, ni de sites de repli.",
].join(" ");

/** Champs en plus pour les cartes de l'interface (photo, surface…). L'agent garde ses champs habituels. */
const CHAMPS_EN_PLUS = [
  "POUR L'AFFICHAGE : dans le bloc JSON final, ajoute à chaque logement ces champs en plus de tes champs habituels (null si l'annonce ne le dit pas) :",
  "photo (adresse https complète de la première photo de l'annonce, telle qu'affichée sur la page),",
  "adresse (adresse la plus précise indiquée : rue si elle est donnée, sinon quartier ou arrondissement avec le code postal et la ville), surface_m2 (nombre), pieces (nombre),",
  "meuble (\"oui\" ou \"non\"), disponible_le (date ou texte), site (nom du site de l'annonce),",
  "description (2 phrases maximum, en français, avec tes mots), equipements (liste courte, par exemple [\"cuisine équipée\", \"lave-linge\"]).",
  "N'invente aucune valeur.",
  "Termine TOUJOURS ta réponse par ce bloc ```json``` contenant la liste des logements, même si tu as déjà listé les logements dans le texte.",
  "Ne pose pas de question à la fin : si une information manque (âge, revenus…), fais une hypothèse raisonnable, dis-la en une phrase et termine la mission.",
].join(" ");

/** Message envoyé à l'agent, à partir du formulaire de l'interface. */
function message(d: Record<string, unknown>) {
  const liens = Array.isArray(d.liens) ? (d.liens as string[]).filter(Boolean) : [];
  return [
    "Demande de logement d'un étudiant (données de test du hackathon Passerelle) :",
    `Ville ou quartiers : ${txt(d.ville)}`,
    `Budget maximum APRÈS aide au logement : ${txt(d.budget)} € par mois`,
    `Type de logement : ${txt(d.type)}`,
    `Meublé : ${txt(d.meuble)}`,
    `Date d'entrée souhaitée : ${txt(d.date_entree)}`,
    `Âge : ${txt(d.age)}`,
    `Boursier : ${txt(d.boursier)}`,
    `Revenus des 12 derniers mois : ${txt(d.revenus)} €`,
    `Situation : ${txt(d.situation ?? "seul(e)")}`,
    liens.length ? `Annonces à lire : ${liens.join(" ")}` : "Pas d'annonce donnée : cherche toi-même.",
    "",
    REGLE_ANTI_ROBOT,
    "",
    CHAMPS_EN_PLUS,
  ].join("\n");
}

/** Extrait la liste JSON des logements de la réponse de l'agent (texte + bloc JSON). */
function logements(reponse: unknown): unknown[] | null {
  if (reponse == null) return null;
  if (Array.isArray(reponse)) return reponse;
  if (typeof reponse === "object") {
    const o = reponse as Record<string, unknown>;
    for (const cle of ["logements", "resultats", "annonces"]) if (Array.isArray(o[cle])) return o[cle] as unknown[];
    // Réponse H sous la forme { content: "texte + bloc JSON" }
    if (typeof o.content === "string" || (o.content && typeof o.content === "object")) return logements(o.content);
    return null;
  }
  const s = String(reponse);
  const bloc = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidat = bloc ? bloc[1] : (s.match(/\[[\s\S]*\]/) ?? [null])[0];
  if (!candidat) return null;
  try {
    const v = JSON.parse(candidat);
    return Array.isArray(v) ? v : logements(v);
  } catch {
    return null;
  }
}

async function sessionConnue(id: string) {
  const { data } = await db.from("logement_h_sessions").select("id").eq("session_id", id).maybeSingle();
  return !!data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ erreur: "Méthode non autorisée" }, 405);
  if (!H_KEY) return json({ erreur: "Secret H_API_KEY manquant" }, 500);

  let corps: Record<string, unknown>;
  try { corps = await req.json(); } catch { return json({ erreur: "JSON invalide" }, 400); }

  try {
    if (corps.action === "lancer") {
      const depuis = new Date(Date.now() - 3600_000).toISOString();
      const { count } = await db.from("logement_h_sessions").select("*", { count: "exact", head: true }).gte("created_at", depuis);
      if ((count ?? 0) >= LIMITE_PAR_HEURE) return json({ erreur: "Trop de recherches cette heure-ci, réessaie plus tard." }, 429);
      const demande = (corps.demande ?? {}) as Record<string, unknown>;
      if (!demande.ville || !demande.budget) return json({ erreur: "Ville et budget sont obligatoires." }, 400);
      const s = await h("/sessions", {
        method: "POST",
        body: JSON.stringify({ agent: AGENT, messages: message(demande), timezone: "Europe/Paris", max_time_s: 1500, idle_timeout_s: 900 }),
      });
      let lien: string | null = null;
      try {
        const p = await h(`/sessions/${s.id}/share`, { method: "POST" });
        if (p.share_url) lien = String(p.share_url).startsWith("http") ? p.share_url : `https://agp.eu.hcompany.ai${p.share_url}`;
      } catch { /* partage facultatif */ }
      const etudiant = typeof corps.etudiant_id === "string" && /^[0-9a-f-]{36}$/.test(corps.etudiant_id) ? corps.etudiant_id : null;
      await db.from("logement_h_sessions").insert({ session_id: s.id, etudiant_id: etudiant, demande: { ...demande, lien_public: lien } });
      return json({ session_id: s.id, lien });
    }

    const id = String(corps.session_id ?? "");
    if (!id || !(await sessionConnue(id))) return json({ erreur: "Recherche inconnue" }, 404);

    if (corps.action === "etat") {
      const s = await h(`/sessions/${id}`);
      const statut = s?.status?.status ?? s?.status;
      const { data } = await db.from("logement_h_sessions").select("demande").eq("session_id", id).single();
      return json({
        statut,
        reponse: s.latest_answer ?? null,
        logements: logements(s.latest_answer),
        etapes: s?.status?.steps ?? null,
        lien: (data?.demande as Record<string, unknown> | null)?.lien_public ?? null,
      });
    }

    if (corps.action === "repondre") {
      const texte = String(corps.message ?? "").trim().slice(0, 2000);
      if (!texte) return json({ erreur: "Message vide" }, 400);
      await h(`/sessions/${id}/messages`, { method: "POST", body: JSON.stringify({ type: "user_message", message: texte }) });
      return json({ ok: true });
    }

    return json({ erreur: "Action inconnue" }, 400);
  } catch (err) {
    return json({ erreur: String(err).slice(0, 300) }, 502);
  }
});
