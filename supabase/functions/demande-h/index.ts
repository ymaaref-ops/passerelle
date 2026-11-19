// Pont interface Passerelle <-> agents H de demande (espace de nrebyffe) : demande-visale, demande-mobili-jeune.
// Clé H : secret H_API_KEY_DEMANDES (à ajouter par nrebyffe dans Edge Functions > Secrets). Jamais exposée à l'interface.
// Actions (POST JSON) :
//   { action: 'lancer', aide: 'visale'|'mobili_jeune', etudiant_id }  -> { session_id, lien }
//   { action: 'etat', session_id }                                    -> { statut, message, lien }
//   { action: 'repondre', session_id, message }                       -> { ok: true }
// Le profil est lu dans Supabase (jamais reçu de l'interface). Limite : 10 lancements par heure.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const H_BASE = Deno.env.get("H_API_BASE") ?? "https://agp.eu.hcompany.ai/api/v2";
const H_KEY = Deno.env.get("H_API_KEY_DEMANDES") ?? "";
const AGENTS: Record<string, string> = { visale: "demande-visale", mobili_jeune: "demande-mobili-jeune" };
const LIMITE_PAR_HEURE = 10;

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
  const t = await r.text();
  if (!r.ok) throw new Error(`H ${r.status} : ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : {};
}

const v = (x: unknown) => (x === null || x === undefined || x === "" ? "non renseigné" : String(x));

/** Profil de l'étudiant lu dans Supabase (fiche + profil saisi + champs lus sur ses documents). */
async function profil(etudiantId: string) {
  const { data: e } = await db.from("etudiants").select("*").eq("id", etudiantId).single();
  if (!e) throw new Error("Étudiant introuvable");
  const { data: docs } = await db.from("documents").select("type, champs_extraits").eq("etudiant_id", etudiantId);
  const champs = (t: string) => ((docs ?? []).find((d) => d.type === t)?.champs_extraits ?? {}) as Record<string, unknown>;
  const id = champs("piece_identite");
  const paie = champs("fiche_paie");
  const cp = (String(e.adresse_logement ?? "").match(/\b\d{5}\b/) ?? [])[0];
  const loyerCC = e.loyer_hors_charges != null ? Number(e.loyer_hors_charges) + Number(e.charges ?? 0) : null;
  return [
    "DOSSIER DE L'ÉTUDIANT (à utiliser à la place de tout exemple écrit dans tes instructions) :",
    `Nom : ${v(e.nom)} | Prénom : ${v(e.prenom)} | Sexe : ${v(id.sexe)}`,
    `Date de naissance : ${v(e.date_naissance)} | Lieu de naissance : ${v(e.lieu_naissance ?? id.lieu_naissance)}`,
    `Nationalité : ${v(e.nationalite)}`,
    `E-mail : ${v(e.email)}`,
    `Téléphone : ${v(e.telephone)}`,
    `Adresse / logement : ${v(e.adresse_logement)} | Code postal : ${v(cp)} | Type : ${v(e.type_logement)}`,
    `Loyer charges comprises : ${v(loyerCC)} €`,
    `Établissement : ${v(e.etablissement)} | Formation : ${v(e.formation)}`,
    `Situation professionnelle : ${v(e.situation_pro)} | Employeur : ${v(paie.employeur)} | Salaire net mensuel : ${v(paie.net_a_payer)} €`,
    `Revenus des 12 derniers mois : ${v(e.ressources_12_mois)} € | Boursier : ${e.boursier === true ? "oui" : e.boursier === false ? "non" : "non renseigné"}`,
    "",
    "Règles : n'utilise aucun autre profil, e-mail ou numéro que ceux donnés ici. " +
      "Ne crée aucun compte et ne te connecte pas : l'étudiant le fera lui-même avec la fiche que tu prépares. " +
      "Ne demande jamais de mot de passe ni de code. Arrête-toi avant tout envoi, validation ou signature.",
  ].join("\n");
}

async function maj(sessionId: string, statut: string) {
  const { data: s } = await db.from("demandes_h_sessions").select("etudiant_id, aide_code").eq("session_id", sessionId).single();
  if (!s?.etudiant_id) return;
  await db.from("demarches").update({ statut, cochee: true, updated_at: new Date().toISOString() })
    .eq("etudiant_id", s.etudiant_id).eq("aide_code", s.aide_code);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ erreur: "Méthode non autorisée" }, 405);
  if (!H_KEY) return json({ erreur: "Agent pas encore activé : la clé H de nrebyffe n'est pas encore ajoutée." }, 503);
  let c: Record<string, unknown>;
  try { c = await req.json(); } catch { return json({ erreur: "JSON invalide" }, 400); }

  try {
    if (c.action === "lancer") {
      const aide = String(c.aide ?? "");
      const agent = AGENTS[aide];
      const etudiantId = String(c.etudiant_id ?? "");
      if (!agent) return json({ erreur: "Aide inconnue" }, 400);
      if (!/^[0-9a-f-]{36}$/.test(etudiantId)) return json({ erreur: "Étudiant manquant : dépose d'abord tes documents." }, 400);
      const depuis = new Date(Date.now() - 3600_000).toISOString();
      const { count } = await db.from("demandes_h_sessions").select("*", { count: "exact", head: true }).gte("created_at", depuis);
      if ((count ?? 0) >= LIMITE_PAR_HEURE) return json({ erreur: "Trop de demandes cette heure-ci, réessaie plus tard." }, 429);
      const s = await h("/sessions", {
        method: "POST",
        body: JSON.stringify({ agent, messages: await profil(etudiantId), timezone: "Europe/Paris", max_time_s: 2400, idle_timeout_s: 1800 }),
      });
      let lien: string | null = null;
      try {
        const p = await h(`/sessions/${s.id}/share`, { method: "POST" });
        if (p.share_url) lien = String(p.share_url).startsWith("http") ? p.share_url : `https://agp.eu.hcompany.ai${p.share_url}`;
      } catch { /* facultatif */ }
      await db.from("demandes_h_sessions").insert({ session_id: s.id, etudiant_id: etudiantId, aide_code: aide, agent, lien_public: lien });
      await maj(s.id, "en_cours");
      return json({ session_id: s.id, lien });
    }

    const id = String(c.session_id ?? "");
    const { data: connue } = await db.from("demandes_h_sessions").select("lien_public").eq("session_id", id).maybeSingle();
    if (!id || !connue) return json({ erreur: "Demande inconnue" }, 404);

    if (c.action === "etat") {
      const s = await h(`/sessions/${id}`);
      const statut = s?.status?.status ?? s?.status;
      const reponse = s.latest_answer;
      const message = typeof reponse === "string" ? reponse : reponse ? JSON.stringify(reponse) : null;
      if (statut === "completed") await maj(id, "pret_a_valider");
      else if (statut === "idle") await maj(id, "connexion_requise");
      else if (["failed", "timed_out", "interrupted"].includes(statut)) await maj(id, "bloquee");
      return json({ statut, message, lien: connue.lien_public, etapes: s?.status?.steps ?? null });
    }

    if (c.action === "repondre") {
      const texte = String(c.message ?? "").trim().slice(0, 2000);
      if (!texte) return json({ erreur: "Message vide" }, 400);
      await h(`/sessions/${id}/messages`, { method: "POST", body: JSON.stringify({ type: "user_message", message: texte }) });
      await maj(id, "en_cours");
      return json({ ok: true });
    }
    return json({ erreur: "Action inconnue" }, 400);
  } catch (err) {
    return json({ erreur: String(err).slice(0, 300) }, 502);
  }
});
