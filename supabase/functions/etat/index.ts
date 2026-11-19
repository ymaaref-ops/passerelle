// État d'un dossier pour l'interface (démarches et documents), lu directement dans la base.
// Remplace l'adresse n8n /passerelle/etat, que l'interface interroge toutes les quelques secondes :
// chaque appel à n8n compte comme une exécution de l'abonnement.
// GET ?etudiant_id=<uuid>  ->  { demarches: [...], documents: [...] }

const URL_SB = Deno.env.get('SUPABASE_URL')!
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

function json(corps: unknown, statut = 200) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

async function rest(chemin: string) {
  const r = await fetch(`${URL_SB}/rest/v1/${chemin}`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  })
  if (!r.ok) throw new Error(`base ${r.status}`)
  return r.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'GET') return json({ erreur: 'Méthode non autorisée' }, 405)
  const id = new URL(req.url).searchParams.get('etudiant_id') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ erreur: 'etudiant_id invalide' }, 400)
  try {
    const [demarches, documents] = await Promise.all([
      rest(
        `demarches?etudiant_id=eq.${id}&select=id,aide_code,statut,niveau,cochee,eligibilite,raison_eligibilite,montant_estime,resultat_agent,updated_at&order=created_at.asc`,
      ),
      rest(`documents?etudiant_id=eq.${id}&select=id,type,statut,champs_extraits,anomalies,created_at&order=created_at.asc`),
    ])
    return json({ demarches, documents })
  } catch (e) {
    return json({ erreur: e instanceof Error ? e.message : 'Erreur' }, 500)
  }
})
