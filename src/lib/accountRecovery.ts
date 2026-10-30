import { createHash, randomBytes } from 'node:crypto'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { emailText } from './quittanceDelivery'

export const normalizeEmail = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : ''
export const validEmail = (email: string) => email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)
export const recoveryToken = () => randomBytes(32).toString('hex')
export const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex')
export function recoveryConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL && !/resend\.dev/i.test(process.env.RESEND_FROM_EMAIL))
}
export function recoveryAdmin() {
  if (!recoveryConfigured()) throw new Error('Récupération privée à activer : configuration serveur manquante.')
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
}
export function publicRecoveryOrigin() {
  const raw = process.env.ACCOUNT_RECOVERY_ORIGIN
  if (!raw) throw new Error('Adresse de récupération à configurer sur le serveur.')
  const url = new URL(raw)
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Adresse de récupération invalide.')
  return url.origin
}
export async function sendRecoveryMail(recipient: string, subject: string, description: string, url: string) {
  const result = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [recipient], subject, html: `<div style="font-family:Arial,sans-serif;max-width:520px;padding:24px"><h2>Ekolocs — votre compte</h2><p>${emailText(description)}</p><p><a href="${emailText(url)}">Continuer sur Ekolocs</a></p><p>Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.</p></div>` }) })
  if (!result.ok) throw new Error('Envoi impossible. Réessayez dans quelques minutes.')
}
