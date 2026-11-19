// Pont Supabase <-> agent H « passerelle-matching ».
// Appelée chaque minute par pg_cron (et à la main pour un test). Elle n'a pas de logique de matching :
//  1. lance l'agent H pour les étudiants en attente (matching_h.statut = 'a_lancer', demande stable depuis 20 s) ;
//  2. récupère les réponses des sessions terminées et les écrit dans demarches + passages_agents.
// verify_jwt = false : la fonction n'agit que sur l'état de la base (file matching_h), jamais sur des données envoyées.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const H_BASE = Deno.env.get("H_API_BASE") ?? "https://agp.eu.hcompany.ai/api/v2";
const H_KEY = Deno.env.get("H_API_KEY") ?? "";
const AGENT = Deno.env.get("H_AGENT_MATCHING") ?? "passerelle-matching";
const ATTENTE_S = 20; // regroupe les dépôts de documents faits en rafale
const DELAI_MAX_MIN = 15; // au-delà, la session est considérée perdue
const TERMINAUX = ["completed", "failed", "timed_out", "interrupted"];
const MONTANT_PAR_AGENT = ["apl", "bourse_crous", "prime_activite"]; // calculés par les simulateurs

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

// Champs d'identité inutiles au matching : jamais envoyés à H.
const CHAMPS_EXCLUS = new Set([
  "nom", "prenom", "adresse", "adresse_logement", "numero_document", "declarants", "bailleur",
  "locataire", "salarie", "employeur", "lieu_naissance", "email",
]);

const FORMAT_REPONSE = {
  type: "object",
  properties: {
    demarches: {
      type: "array",
      items: {
        type: "object",
        properties: {
          aide_code: { type: "string" },
          eligibilite: { type: "string", enum: ["eligible", "peut_etre", "non_concerne"] },
          raison: { type: "string" },
          montant_estime: { type: ["number", "null"] },
        },
        required: ["aide_code", "eligibilite", "raison", "montant_estime"],
      },
    },
    pieces_a_fournir: { type: "array", items: { type: "string" } },
    resume: { type: "string" },
  },
  required: ["demarches", "resume"],
};

async function h(path: string, init: RequestInit = {}) {
  const r = await fetch(`${H_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${H_KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`H ${r.status} ${path} : ${txt.slice(0, 300)}`);
  return txt ? JSON.parse(txt) : {};
}

function nettoyer(champs: Record<string, unknown> | null) {
  if (!champs) return null;
  return Object.fromEntries(Object.entries(champs).filter(([k]) => !CHAMPS_EXCLUS.has(k)));
}

async function donneesEtudiant(id: string) {
  const { data: e, error } = await db.from("etudiants").select(
    "date_naissance, nationalite, etablissement, formation, ville_etudes, type_logement, logement_conventionne, loyer_hors_charges, charges, situation_pro, ressources_12_mois, boursier",
  ).eq("id", id).single();
  if (error) throw error;
  const { data: docs } = await db.from("documents")
    .select("type, statut, champs_extraits, anomalies, created_at").eq("etudiant_id", id).order("created_at");
  const { data: aides } = await db.from("aides")
    .select("code, nom, categorie, montant, montant_max, conditions, date_limite, lien, niveau, regle_eligibilite")
    .order("ordre");
  return {
    date_du_jour: new Date().toISOString().slice(0, 10),
    profil: e,
    documents: (docs ?? []).map((d) => ({
      type: d.type, statut: d.statut, depose_le: d.created_at,
      champs: nettoyer(d.champs_extraits as Record<string, unknown>),
      anomalies: d.anomalies,
    })),
    aides: aides ?? [],
  };
}

async function lancer(ligne: { etudiant_id: string; demande_le: string }) {
  // Réserve la demande (si un nouveau document est arrivé entre-temps, demande_le a changé : on laisse pour le prochain passage)
  const { data: prise } = await db.from("matching_h")
    .update({ statut: "en_cours", lance_le: new Date().toISOString(), session_id: null, erreur: null })
    .eq("etudiant_id", ligne.etudiant_id).eq("statut", "a_lancer").eq("demande_le", ligne.demande_le)
    .select();
  if (!prise?.length) return null;
  try {
    const donnees = await donneesEtudiant(ligne.etudiant_id);
    const s = await h("/sessions", {
      method: "POST",
      body: JSON.stringify({
        agent: AGENT,
        messages: "Fais le matching des aides pour cet étudiant selon tes instructions. Données (JSON) :\n" +
          JSON.stringify(donnees),
        overrides: { "agent.answer_format": FORMAT_REPONSE },
      }),
    });
    await db.from("matching_h").update({ session_id: s.id }).eq("etudiant_id", ligne.etudiant_id).eq("statut", "en_cours");
    return s.id as string;
  } catch (err) {
    await db.from("matching_h").update({ statut: "erreur", erreur: String(err), termine_le: new Date().toISOString() })
      .eq("etudiant_id", ligne.etudiant_id).eq("statut", "en_cours");
    return null;
  }
}

function lireReponse(rep: unknown): any {
  if (rep == null) return null;
  if (typeof rep === "string") {
    const m = rep.match(/\{[\s\S]*\}/);
    try { return JSON.parse(m ? m[0] : rep); } catch { return null; }
  }
  return rep;
}

async function ecrire(etudiant_id: string, reponse: any) {
  const { data: aides } = await db.from("aides").select("code, niveau, montant_max");
  const catalogue = new Map((aides ?? []).map((a) => [a.code, a]));
  const { data: existantes } = await db.from("demarches")
    .select("aide_code, montant_estime, resultat_agent").eq("etudiant_id", etudiant_id);
  const avant = new Map((existantes ?? []).map((d) => [d.aide_code, d]));
  const lignes = [];
  for (const d of reponse?.demarches ?? []) {
    const aide = catalogue.get(d.aide_code);
    if (!aide || !["eligible", "peut_etre", "non_concerne"].includes(d.eligibilite)) continue; // code inconnu : ignoré
    const ex = avant.get(d.aide_code);
    const garderMontant = ex?.montant_estime != null && (MONTANT_PAR_AGENT.includes(d.aide_code) || ex?.resultat_agent);
    lignes.push({
      etudiant_id, aide_code: d.aide_code, eligibilite: d.eligibilite,
      raison_eligibilite: String(d.raison ?? "").slice(0, 1000), niveau: aide.niveau,
      montant_estime: garderMontant ? ex!.montant_estime
        : d.eligibilite === "non_concerne" ? null
        : typeof d.montant_estime === "number" ? d.montant_estime : null,
      updated_at: new Date().toISOString(),
    });
  }
  if (lignes.length) {
    // upsert : seules ces colonnes changent ; cochee, statut, resultat_agent, checklist… sont conservés
    const { error } = await db.from("demarches").upsert(lignes, { onConflict: "etudiant_id,aide_code" });
    if (error) throw error;
  }
  return lignes.length;
}

async function relever() {
  const { data: enCours } = await db.from("matching_h").select("*").eq("statut", "en_cours").not("session_id", "is", null);
  const bilan = [];
  for (const m of enCours ?? []) {
    try {
      const s = await h(`/sessions/${m.session_id}`);
      const statut = s?.status?.status ?? s?.status;
      if (!TERMINAUX.includes(statut)) {
        if (Date.now() - new Date(m.lance_le).getTime() > DELAI_MAX_MIN * 60_000) {
          await db.from("matching_h").update({ statut: "erreur", erreur: "Session H trop longue", termine_le: new Date().toISOString() })
            .eq("etudiant_id", m.etudiant_id).eq("session_id", m.session_id);
        }
        continue;
      }
      const reponse = statut === "completed" ? lireReponse(s.latest_answer) : null;
      const n = reponse ? await ecrire(m.etudiant_id, reponse) : 0;
      const fin = new Date().toISOString();
      await db.from("passages_agents").insert({
        etudiant_id: m.etudiant_id, site: "matching", agent: AGENT, session_id: m.session_id,
        statut: ["completed", "failed", "timed_out", "interrupted"].includes(statut) ? statut : "erreur",
        debut: m.lance_le, fin, resultat: reponse,
        erreur: n ? null : (s?.status?.error ?? "Réponse illisible ou vide"),
      });
      // Ne termine que si aucune nouvelle demande n'est arrivée pendant la session
      await db.from("matching_h").update({
        statut: n ? "termine" : "erreur", termine_le: fin, resultat: reponse,
        erreur: n ? null : `Session ${statut}, ${n} aide(s) écrite(s)`,
      }).eq("etudiant_id", m.etudiant_id).eq("session_id", m.session_id).eq("statut", "en_cours");
      bilan.push({ etudiant_id: m.etudiant_id, statut, aides_ecrites: n });
    } catch (err) {
      bilan.push({ etudiant_id: m.etudiant_id, erreur: String(err) });
    }
  }
  return bilan;
}

Deno.serve(async (req) => {
  if (!H_KEY) {
    return Response.json({ erreur: "Secret H_API_KEY manquant dans les Edge Functions" }, { status: 500 });
  }
  const url = new URL(req.url);
  const immediat = url.searchParams.get("immediat") === "1"; // test manuel : ignore l'attente de 20 s
  const limite = new Date(Date.now() - (immediat ? 0 : ATTENTE_S) * 1000).toISOString();

  const releves = await relever();
  const { data: aLancer } = await db.from("matching_h").select("etudiant_id, demande_le")
    .eq("statut", "a_lancer").lte("demande_le", limite).limit(10);
  const lances = [];
  for (const l of aLancer ?? []) {
    const id = await lancer(l);
    if (id) lances.push({ etudiant_id: l.etudiant_id, session_id: id });
  }

  // Pour aller plus vite qu'une minute : relever en arrière-plan pendant ~2 min après un lancement
  if (lances.length) {
    // @ts-ignore EdgeRuntime existe sur Supabase
    EdgeRuntime.waitUntil((async () => {
      for (let i = 0; i < 24; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const { count } = await db.from("matching_h").select("*", { count: "exact", head: true }).eq("statut", "en_cours");
        if (!count) break;
        await relever();
      }
    })());
  }
  return Response.json({ releves, lances });
});
