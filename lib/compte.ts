/**
 * Compte Passerelle (Supabase Auth, appelé directement en HTTP).
 * La session est gardée dans le navigateur ; la fonction « compte » relie le compte à son dossier de documents.
 */
import type { DocumentN8n } from '@/lib/n8n'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://hnziztstifpipxrgdnop.supabase.co'
/** Clé publique (publishable) : prévue pour être utilisée dans le navigateur. */
const CLE_PUBLIQUE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_nNEDO_UdoVhSIyB-FH_oBQ_NLhtngOw'
const URL_COMPTE = `${SUPABASE_URL}/functions/v1/compte`
const CLE_SESSION = 'passerelle_session'
export const EVENEMENT_COMPTE = 'passerelle-compte'

export interface Session {
  access_token: string
  refresh_token: string
  expires_at: number
  email: string
  prenom: string | null
}

export interface DocumentEnregistre extends DocumentN8n {
  created_at?: string
  photo_supprimee_le?: string | null
}

export interface MonCompte {
  email: string | null
  prenom: string | null
  etudiant_id: string | null
  documents: DocumentEnregistre[]
}

export interface PhotoEnregistree {
  type: string
  nom_fichier: string | null
  mime: string | null
  contenu_base64: string
}

function lireSessionBrute(): Session | null {
  if (typeof window === 'undefined') return null
  try {
    const brut = window.localStorage.getItem(CLE_SESSION)
    return brut ? (JSON.parse(brut) as Session) : null
  } catch {
    return null
  }
}

function enregistrerSession(s: Session | null) {
  try {
    if (s) window.localStorage.setItem(CLE_SESSION, JSON.stringify(s))
    else window.localStorage.removeItem(CLE_SESSION)
  } catch {
    // Stockage indisponible : la session ne durera que le temps de la page.
  }
  window.dispatchEvent(new Event(EVENEMENT_COMPTE))
}

/** Session courante (sans vérifier qu'elle est encore valide). */
export function sessionCourante(): Session | null {
  return lireSessionBrute()
}

interface ReponseAuth {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  user?: { email?: string; user_metadata?: { prenom?: string } }
  email?: string
  msg?: string
  error_description?: string
  error_code?: string
  message?: string
}

function messageErreur(r: ReponseAuth, statut: number): string {
  const code = r.error_code ?? ''
  const brut = (r.error_description ?? r.msg ?? r.message ?? '').toLowerCase()
  if (code === 'invalid_credentials' || brut.includes('invalid login')) return 'E-mail ou mot de passe incorrect.'
  if (code === 'email_not_confirmed' || brut.includes('not confirmed'))
    return "Ton e-mail n'est pas encore confirmé : clique sur le lien reçu par e-mail."
  if (code === 'user_already_exists' || brut.includes('already registered'))
    return 'Un compte existe déjà avec cet e-mail : connecte-toi.'
  if (code === 'weak_password' || brut.includes('password should'))
    return 'Mot de passe trop court : 6 caractères minimum.'
  if (code === 'over_email_send_rate_limit' || statut === 429)
    return "Trop d'essais pour le moment. Réessaie dans quelques minutes."
  if (brut.includes('invalid') && brut.includes('email')) return "Cette adresse e-mail n'est pas valide."
  return "Ça n'a pas marché. Réessaie dans un instant."
}

function versSession(r: ReponseAuth, prenomParDefaut: string | null = null): Session {
  return {
    access_token: r.access_token as string,
    refresh_token: r.refresh_token as string,
    expires_at: Date.now() + (r.expires_in ?? 3600) * 1000,
    email: r.user?.email ?? '',
    prenom: r.user?.user_metadata?.prenom ?? prenomParDefaut,
  }
}

async function appelAuth(chemin: string, corps: unknown): Promise<{ r: ReponseAuth; statut: number }> {
  const reponse = await fetch(`${SUPABASE_URL}/auth/v1/${chemin}`, {
    method: 'POST',
    headers: { apikey: CLE_PUBLIQUE, 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  })
  const r = (await reponse.json().catch(() => ({}))) as ReponseAuth
  return { r, statut: reponse.status }
}

/** Crée un compte. Renvoie 'connecte', ou 'confirmer' si un e-mail de confirmation a été envoyé. */
export async function creerCompte(prenom: string, email: string, motDePasse: string): Promise<'connecte' | 'confirmer'> {
  const { r, statut } = await appelAuth('signup', { email, password: motDePasse, data: { prenom } })
  if (statut >= 400) throw new Error(messageErreur(r, statut))
  if (!r.access_token) return 'confirmer'
  enregistrerSession(versSession(r, prenom))
  return 'connecte'
}

export async function seConnecter(email: string, motDePasse: string): Promise<void> {
  const { r, statut } = await appelAuth('token?grant_type=password', { email, password: motDePasse })
  if (statut >= 400 || !r.access_token) throw new Error(messageErreur(r, statut))
  enregistrerSession(versSession(r))
}

export function seDeconnecter(): void {
  const s = lireSessionBrute()
  if (s) {
    void fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: { apikey: CLE_PUBLIQUE, Authorization: `Bearer ${s.access_token}` },
    }).catch(() => undefined)
  }
  try {
    window.localStorage.removeItem('passerelle_etudiant_id')
    window.sessionStorage.removeItem('passerelle_documents_valides')
    window.sessionStorage.removeItem('passerelle_situation')
  } catch {
    // rien
  }
  enregistrerSession(null)
}

/** Jeton valide (rafraîchi si besoin), ou null si l'étudiant doit se reconnecter. */
export async function jetonValide(): Promise<string | null> {
  const s = lireSessionBrute()
  if (!s) return null
  if (s.expires_at - Date.now() > 60_000) return s.access_token
  const { r, statut } = await appelAuth('token?grant_type=refresh_token', { refresh_token: s.refresh_token })
  if (statut >= 400 || !r.access_token) {
    enregistrerSession(null)
    return null
  }
  enregistrerSession({ ...versSession(r, s.prenom), email: r.user?.email ?? s.email })
  return r.access_token as string
}

async function appelCompte<T>(corps: Record<string, unknown>): Promise<T> {
  const jeton = await jetonValide()
  if (!jeton) throw new Error('Connecte-toi pour continuer.')
  const reponse = await fetch(URL_COMPTE, {
    method: 'POST',
    headers: { apikey: CLE_PUBLIQUE, Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  })
  const json = (await reponse.json().catch(() => ({}))) as T & { erreur?: string }
  if (!reponse.ok) throw new Error(json.erreur ?? `Erreur ${reponse.status}`)
  return json
}

/** Le compte et les documents de son dernier dossier. */
export function lireMonCompte(): Promise<MonCompte> {
  return appelCompte<MonCompte>({ action: 'moi' })
}

/** Relie le dossier qui vient d'être déposé au compte. */
export function lierDossier(etudiantId: string): Promise<unknown> {
  return appelCompte({ action: 'lier', etudiant_id: etudiantId })
}

/** Photos gardées (30 jours max) du dernier dossier, pour pouvoir n'en remplacer qu'une. */
export async function lirePhotos(): Promise<PhotoEnregistree[]> {
  const { photos } = await appelCompte<{ photos: PhotoEnregistree[] }>({ action: 'photos' })
  return photos ?? []
}

export function photoVersFichier(p: PhotoEnregistree): File {
  const binaire = atob(p.contenu_base64)
  const octets = new Uint8Array(binaire.length)
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i)
  return new File([octets], p.nom_fichier ?? `${p.type}.png`, { type: p.mime ?? 'image/png' })
}
