import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { normalizeEmail, validEmail, recoveryConfigured, recoveryAdmin, recoveryToken, tokenHash, publicRecoveryOrigin, sendRecoveryMail } from '@/lib/accountRecovery'
export const runtime = 'nodejs'
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
const generic = { ok: true, message: 'Si ce compte existe, un lien a été envoyé à son adresse de récupération vérifiée, ou à son adresse de connexion si aucune adresse privée n’est activée.' }
export async function GET() {
  const client = await createClient()
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) return reply({ error: 'Non autorisé' }, 401)
  if (!recoveryConfigured() || !process.env.ACCOUNT_RECOVERY_ORIGIN) return reply({ configured: false, recoveryEmail: '', pendingEmail: '' })
  const { data, error: tableError } = await recoveryAdmin().from('account_recovery_settings').select('recovery_email,pending_email,confirmation_expires_at').eq('user_id', user.id).maybeSingle()
  if (tableError) return reply({ configured: false, recoveryEmail: '', pendingEmail: '' })
  return reply({ configured: true, recoveryEmail: data?.recovery_email ?? '', pendingEmail: data?.confirmation_expires_at && new Date(data.confirmation_expires_at) > new Date() ? data.pending_email ?? '' : '' })
}
export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    if (origin && origin !== request.nextUrl.origin) return reply({ error: 'Origine refusée' }, 403)
    if (Number(request.headers.get('content-length')) > 4096) return reply({ error: 'Données trop volumineuses' }, 413)
    const body = await request.json()
    if (!['configure', 'confirm', 'request'].includes(body.action)) return reply({ error: 'Action invalide' }, 400)
    const base = publicRecoveryOrigin(), admin = recoveryAdmin()
    if (body.action === 'configure') {
      const client = await createClient()
      const { data: { user }, error } = await client.auth.getUser()
      if (error || !user?.email) return reply({ error: 'Non autorisé' }, 401)
      const email = normalizeEmail(body.email)
      if (!validEmail(email) || email === normalizeEmail(user.email) || typeof body.password !== 'string' || body.password.length > 1024) return reply({ error: 'Renseignez une adresse privée distincte et votre mot de passe actuel.' }, 400)
      const verifier = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
      const { data: verified, error: verificationError } = await verifier.auth.signInWithPassword({ email: user.email, password: body.password })
      if (verificationError || verified.user?.id !== user.id || verified.user?.factors?.some(f=>f.status==='verified')) return reply({ error: 'Vérification du compte impossible. Vérifiez votre mot de passe et les facteurs d’authentification.' }, 403)
      const token = recoveryToken()
      const { data: reserved, error: reserveError } = await admin.rpc('reserve_recovery_confirmation', { p_user: user.id, p_email: email, p_hash: tokenHash(token) })
      if (reserveError) return reply({ error: 'Récupération privée indisponible. Vérifiez la migration Supabase.' }, 503)
      if (!reserved) return reply({ error: 'Patientez deux minutes avant une nouvelle demande.' }, 429)
      await sendRecoveryMail(email, 'Ekolocs — confirmez votre adresse de récupération', 'Confirmez cette adresse privée pour récupérer votre compte. Ce lien est valable 30 minutes.', `${base}/recuperer#confirmation=${token}`)
      return reply({ ok: true, pendingEmail: email })
    }
    if (body.action === 'confirm') {
      if (typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token)) return reply({ error: 'Lien invalide ou expiré.' }, 400)
      // Atomic conditional update: a token is consumed only once and never changes the login address.
      const hash = tokenHash(body.token)
      const { data: pending, error } = await admin.from('account_recovery_settings').select('pending_email').eq('confirmation_hash', hash).gt('confirmation_expires_at', new Date().toISOString()).maybeSingle()
      if (error || !pending?.pending_email) return reply({ error: 'Lien invalide ou expiré.' }, 400)
      const { data, error: saveError } = await admin.from('account_recovery_settings').update({ recovery_email: pending.pending_email, pending_email: null, confirmation_hash: null, confirmation_expires_at: null }).eq('confirmation_hash', hash).gt('confirmation_expires_at', new Date().toISOString()).select('user_id').maybeSingle()
      if (saveError || !data) return reply({ error: 'Lien invalide ou déjà utilisé.' }, 400)
      return reply({ ok: true })
    }
    const email = normalizeEmail(body.email)
    if (!validEmail(email)) return reply({ error: 'Renseignez votre adresse de connexion.' }, 400)
    const { data, error } = await admin.rpc('reserve_password_recovery', { p_login_email: email })
    if (error) return reply({ error: 'Récupération indisponible. Réessayez plus tard.' }, 503)
    const account = data?.[0]
    if (account) {
      // Native one-use Supabase token: no password is ever changed by the admin client.
      const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'recovery', email: account.login_email })
      if (!linkError && link.user?.id === account.user_id && link.properties?.hashed_token) {
        try { await sendRecoveryMail(account.recipient, 'Ekolocs — récupération de votre compte', 'Vous avez demandé à réinitialiser votre mot de passe. Utilisez ce lien à usage unique pour en choisir un nouveau.', `${base}/recuperer#recovery=${link.properties.hashed_token}`) } catch { /* Same public response prevents revealing whether an account exists. */ }
      }
    }
    return reply(generic)
  } catch {
    return reply({ error: 'Récupération privée indisponible. Vérifiez la configuration serveur, puis réessayez.' }, 503)
  }
}
