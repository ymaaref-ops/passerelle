// Compte Passerelle : relie un compte (Supabase Auth) à son dernier dossier de documents.
// Actions (POST JSON { action }) : moi, lier { etudiant_id }, photos, enregistrer_profil { profil },
// enregistrer_situation { situation }, enregistrer_questionnaire { email_demarches, reponses }.
// L'utilisateur est vérifié avec son jeton ; les tables sont lues avec la clé de service.

const URL_SB = Deno.env.get('SUPABASE_URL')!
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Champs que l'étudiant peut remplir ou corriger, et leur type. */
const MODIFIABLES: Record<string, 'texte' | 'date' | 'nombre' | 'booleen'> = {
  prenom: 'texte',
  nom: 'texte',
  date_naissance: 'date',
  lieu_naissance: 'texte',
  nationalite: 'texte',
  telephone: 'texte',
  etablissement: 'texte',
  formation: 'texte',
  adresse_logement: 'texte',
  code_postal: 'texte',
  type_logement: 'texte',
  loyer_hors_charges: 'nombre',
  charges: 'nombre',
  situation_pro: 'texte',
  ressources_12_mois: 'nombre',
  boursier: 'booleen',
}
/** Champs obligatoires dans la table : jamais vidés. */
const OBLIGATOIRES = ['nom', 'prenom']
/** Champs qui ne sont pas lus sur les documents : recopiés sur chaque nouveau dossier. */
const HORS_DOCUMENTS = ['telephone', 'lieu_naissance', 'code_postal']
const CHAMPS_PROFIL = Object.keys(MODIFIABLES).join(',')

/** Réponses du questionnaire (spécification d'Ema) : clés simples, valeurs courtes, 150 réponses au plus. */
function nettoyerQuestionnaire(brut: unknown): Record<string, string | number | boolean | null> | null {
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return null
  const propre: Record<string, string | number | boolean | null> = {}
  for (const [cle, v] of Object.entries(brut as Record<string, unknown>).slice(0, 150)) {
    if (!/^[a-z0-9_]{1,40}$/.test(cle)) continue
    if (v === null || typeof v === 'boolean') propre[cle] = v
    else if (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 10_000_000) propre[cle] = v
    else if (typeof v === 'string') propre[cle] = v.trim().slice(0, 300)
  }
  return propre
}

const SITUATION: Record<string, string[]> = {
  logement: ['locataire', 'parents', 'cherche'],
  activite: ['alternance', 'job', 'aucune'],
  bourse: ['oui', 'non', 'ne_sais_pas'],
}

function json(corps: unknown, statut = 200) {
  return new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

async function rest(chemin: string, init: RequestInit = {}) {
  const r = await fetch(`${URL_SB}/rest/v1/${chemin}`, {
    ...init,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers ?? {}),
    },
  })
  const texte = await r.text()
  if (!r.ok) throw new Error(`base ${r.status} ${texte.slice(0, 200)}`)
  return texte ? JSON.parse(texte) : null
}

async function utilisateur(req: Request) {
  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return null
  const r = await fetch(`${URL_SB}/auth/v1/user`, { headers: { apikey: ANON, Authorization: auth } })
  if (!r.ok) return null
  return (await r.json()) as { id: string; email?: string; created_at?: string; user_metadata?: { prenom?: string } }
}

async function compteDe(u: { id: string; email?: string; user_metadata?: { prenom?: string } }) {
  const lignes = await rest(`comptes?auth_user_id=eq.${u.id}&select=*`)
  if (lignes.length) return lignes[0]
  const cree = await rest('comptes', {
    method: 'POST',
    body: JSON.stringify({ auth_user_id: u.id, email: u.email ?? null, prenom: u.user_metadata?.prenom ?? null }),
  })
  return cree[0]
}

/** Vérifie et nettoie le profil envoyé par l'interface. */
function nettoyer(brut: Record<string, unknown>): { valeurs: Record<string, unknown>; erreur: string | null } {
  const valeurs: Record<string, unknown> = {}
  for (const [cle, type] of Object.entries(MODIFIABLES)) {
    if (!(cle in brut)) continue
    const v = brut[cle]
    if (v === null || v === undefined || String(v).trim() === '') {
      if (!OBLIGATOIRES.includes(cle)) valeurs[cle] = null
      continue
    }
    if (type === 'texte') valeurs[cle] = String(v).trim().slice(0, 200)
    if (type === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return { valeurs, erreur: 'Date de naissance invalide.' }
      valeurs[cle] = String(v)
    }
    if (type === 'nombre') {
      const n = Number(String(v).replace(',', '.'))
      if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return { valeurs, erreur: `Montant invalide (${cle}).` }
      valeurs[cle] = n
    }
    if (type === 'booleen') valeurs[cle] = v === true || v === 'true' || v === 'oui'
  }
  if (typeof valeurs.code_postal === 'string' && !/^\d{5}$/.test(valeurs.code_postal)) {
    return { valeurs, erreur: 'Le code postal fait 5 chiffres.' }
  }
  return { valeurs, erreur: null }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée' }, 405)
  try {
    const u = await utilisateur(req)
    if (!u) return json({ erreur: 'Connecte-toi pour continuer.' }, 401)
    const corps = await req.json().catch(() => ({}))
    const compte = await compteDe(u)

    if (corps.action === 'enregistrer_situation') {
      const s = (corps.situation ?? {}) as Record<string, unknown>
      const propre: Record<string, unknown> = {}
      for (const [cle, valeurs] of Object.entries(SITUATION)) {
        if (!valeurs.includes(String(s[cle]))) return json({ erreur: 'Situation invalide.' }, 400)
        propre[cle] = String(s[cle])
      }
      const r = Number(s.ressources)
      propre.ressources = Number.isFinite(r) && r >= 0 && r < 1_000_000 ? r : 0
      await rest(`comptes?auth_user_id=eq.${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ situation: propre, updated_at: new Date().toISOString() }),
      })
      return json({ ok: true })
    }

    if (corps.action === 'enregistrer_questionnaire') {
      const email = String(corps.email_demarches ?? '').trim().slice(0, 200)
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ erreur: 'E-mail invalide.' }, 400)
      const reponses = nettoyerQuestionnaire(corps.reponses)
      if (!reponses) return json({ erreur: 'Réponses invalides.' }, 400)
      const maintenant = new Date().toISOString()
      // Gardé dans le compte (le questionnaire est souvent rempli avant le dépôt des documents)…
      await rest(`comptes?auth_user_id=eq.${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          questionnaire: { email_demarches: email || null, reponses, mis_a_jour: maintenant },
          updated_at: maintenant,
        }),
      })
      // … et recopié sur le dossier s'il existe déjà, pour n8n et les agents H.
      if (compte.etudiant_id) {
        await rest(`etudiants?id=eq.${compte.etudiant_id}`, {
          method: 'PATCH',
          body: JSON.stringify({ email_demarches: email || null, questionnaire_reponses: reponses, updated_at: maintenant }),
        })
      }
      return json({ ok: true })
    }

    if (corps.action === 'enregistrer_profil') {
      const { valeurs, erreur } = nettoyer((corps.profil ?? {}) as Record<string, unknown>)
      if (erreur) return json({ erreur }, 400)
      let etudiantId = compte.etudiant_id as string | null
      if (etudiantId) {
        await rest(`etudiants?id=eq.${etudiantId}`, {
          method: 'PATCH',
          body: JSON.stringify({ ...valeurs, email: u.email ?? null, updated_at: new Date().toISOString() }),
        })
      } else {
        // Pas encore de documents : on crée la fiche, que le premier dépôt complétera.
        const cree = await rest('etudiants', {
          method: 'POST',
          body: JSON.stringify({
            ...valeurs,
            nom: valeurs.nom ?? '',
            prenom: valeurs.prenom ?? compte.prenom ?? u.user_metadata?.prenom ?? '',
            email: u.email ?? null,
          }),
        })
        etudiantId = cree[0].id
      }
      await rest(`comptes?auth_user_id=eq.${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          etudiant_id: etudiantId,
          prenom: (valeurs.prenom as string | undefined) ?? compte.prenom,
          profil_saisi: { ...(compte.profil_saisi ?? {}), ...valeurs },
          updated_at: new Date().toISOString(),
        }),
      })
      const lignes = await rest(`etudiants?id=eq.${etudiantId}&select=${CHAMPS_PROFIL}`)
      return json({ ok: true, etudiant_id: etudiantId, profil: lignes[0] ?? null })
    }

    if (corps.action === 'lier') {
      const id = String(corps.etudiant_id ?? '')
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ erreur: 'Dossier invalide.' }, 400)
      // Seulement un dossier tout juste déposé et qui n'appartient à personne d'autre.
      const etu = await rest(`etudiants?id=eq.${id}&select=id,created_at`)
      if (!etu.length) return json({ erreur: 'Dossier introuvable.' }, 404)
      if (Date.now() - new Date(etu[0].created_at).getTime() > 3 * 3600 * 1000) {
        return json({ erreur: 'Ce dossier est trop ancien pour être relié.' }, 403)
      }
      const autre = await rest(`comptes?etudiant_id=eq.${id}&auth_user_id=neq.${u.id}&select=auth_user_id`)
      if (autre.length) return json({ erreur: 'Ce dossier appartient à un autre compte.' }, 403)
      await rest(`comptes?auth_user_id=eq.${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ etudiant_id: id, updated_at: new Date().toISOString() }),
      })
      // Les informations saisies qui ne viennent pas des documents suivent le nouveau dossier.
      const saisi = (compte.profil_saisi ?? {}) as Record<string, unknown>
      const reprises = Object.fromEntries(HORS_DOCUMENTS.filter((c) => saisi[c] != null).map((c) => [c, saisi[c]]))
      // Le questionnaire rempli avant le dépôt suit aussi le nouveau dossier.
      const q = (compte.questionnaire ?? {}) as { email_demarches?: string | null; reponses?: Record<string, unknown> }
      const questionnaire = q.reponses ? { email_demarches: q.email_demarches ?? null, questionnaire_reponses: q.reponses } : {}
      await rest(`etudiants?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...reprises, ...questionnaire, email: u.email ?? null }),
      })
      return json({ ok: true, etudiant_id: id })
    }

    if (corps.action === 'photos') {
      if (!compte.etudiant_id) return json({ photos: [] })
      const docs = await rest(
        `documents?etudiant_id=eq.${compte.etudiant_id}&select=id,type,documents_fichiers(nom_fichier,mime,contenu_base64)`,
      )
      const photos = docs.flatMap((d: { type: string; documents_fichiers: { nom_fichier: string; mime: string; contenu_base64: string }[] }) =>
        (d.documents_fichiers ?? []).slice(0, 1).map((f) => ({ type: d.type, ...f })),
      )
      return json({ photos })
    }

    // moi : le compte, la situation, le profil, les documents et l'éligibilité calculée du dernier dossier.
    let documents: unknown[] = []
    let profil: Record<string, unknown> | null = null
    let eligibilite: unknown[] = []
    if (compte.etudiant_id) {
      documents = await rest(
        `documents?etudiant_id=eq.${compte.etudiant_id}&select=id,type,statut,champs_extraits,anomalies,created_at,photo_supprimee_le&order=created_at.desc`,
      )
      const lignes = await rest(`etudiants?id=eq.${compte.etudiant_id}&select=${CHAMPS_PROFIL}`)
      profil = lignes[0] ?? null
      eligibilite = await rest(
        `demarches?etudiant_id=eq.${compte.etudiant_id}&eligibilite=not.is.null&select=aide_code,eligibilite,raison_eligibilite,montant_estime&order=created_at.desc`,
      )
    }
    return json({
      email: u.email ?? null,
      prenom: compte.prenom ?? u.user_metadata?.prenom ?? null,
      inscrit_le: compte.created_at ?? u.created_at ?? null,
      etudiant_id: compte.etudiant_id ?? null,
      situation: compte.situation ?? null,
      questionnaire: compte.questionnaire ?? null,
      profil,
      documents,
      eligibilite,
    })
  } catch (e) {
    return json({ erreur: e instanceof Error ? e.message : 'Erreur' }, 500)
  }
})
