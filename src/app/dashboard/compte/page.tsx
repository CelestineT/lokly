'use client'

import './compte.css'
import RecoveryEmail from './RecoveryEmail'
import PublicContactEmail from './PublicContactEmail'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserRound, Mail, LockKeyhole, SlidersHorizontal, LogOut, Pencil, ChevronRight, House, CircleHelp, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AccountPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [nextEmail, setNextEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [editing, setEditing] = useState<'email' | 'password' | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const client = createClient()
        const { data: { user }, error: authError } = await client.auth.getUser()
        if (authError) throw authError
        if (!user) throw new Error('Veuillez vous reconnecter pour accéder à votre compte.')
        const { data: profile } = await client.from('profiles').select('prenom, nom').eq('id', user.id).maybeSingle()
        if (!active) return
        const first = user.user_metadata?.prenom ?? profile?.prenom ?? ''
        const last = user.user_metadata?.nom ?? profile?.nom ?? ''
        setFirstName(first); setLastName(last); setDisplayName([first, last].filter(Boolean).join(' '))
        setEmail(user.email ?? ''); setNextEmail(user.email ?? ''); setPendingEmail(user.new_email ?? '')
        if (new URLSearchParams(window.location.search).get('confirmation') === 'error') setError('Le lien de confirmation est expiré ou invalide. Réessayez depuis cette page.')
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Impossible de charger votre compte.') }
      finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [])
  function openEditor(value: 'email' | 'password' | null) {
    setEditing(value); setError(null); setMessage(null); setPassword(''); setCurrentPassword(''); setConfirmation(''); setShowPassword(false); setNextEmail(email)
  }
  async function perform(action: string, task: () => Promise<void>) {
    setBusy(action); setError(null); setMessage(null)
    try { await task() } catch (e) { setError(e instanceof Error ? e.message : 'La modification a échoué. Veuillez réessayer.') }
    finally { setBusy(null) }
  }
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    await perform('profile', async () => {
      const { error } = await createClient().auth.updateUser({ data: { prenom: firstName.trim(), nom: lastName.trim() } })
      if (error) throw error
      setDisplayName([firstName.trim(), lastName.trim()].filter(Boolean).join(' ')); setMessage('Votre profil de connexion a été enregistré.')
    })
  }
  async function saveEmail(e: React.FormEvent) {
    e.preventDefault()
    await perform('email', async () => {
      if (nextEmail.trim().toLowerCase() === email.toLowerCase()) throw new Error('Renseignez une nouvelle adresse e-mail.')
      const { data, error } = await createClient().auth.updateUser({ email: nextEmail.trim() }, { emailRedirectTo: `${window.location.origin}/auth/callback` })
      if (error) throw error
      if (data.user?.email === nextEmail.trim()) { setEmail(data.user.email); setPendingEmail(''); setMessage('Votre adresse de connexion a été mise à jour.') }
      else { setPendingEmail(nextEmail.trim()); setMessage('Demande enregistrée. Consultez votre nouvelle adresse et votre adresse actuelle pour suivre les confirmations demandées. L’adresse de connexion reste inchangée jusqu’à validation.') }
      setEditing(null)
    })
  }
  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    await perform('password', async () => {
      if (password !== confirmation) throw new Error('Les deux nouveaux mots de passe ne correspondent pas.')
      if (password.length < 8) throw new Error('Choisissez un mot de passe d’au moins 8 caractères.')
      const client = createClient()
      const { data: { user }, error: sessionError } = await client.auth.getUser()
      if (sessionError || !user?.email) throw new Error('Veuillez vous reconnecter pour modifier votre mot de passe.')
      const { data: authenticated, error: verificationError } = await client.auth.signInWithPassword({ email: user.email, password: currentPassword })
      if (verificationError || authenticated.user?.id !== user.id) throw new Error('Le mot de passe actuel est incorrect ou une vérification supplémentaire est nécessaire.')
      const { error } = await client.auth.updateUser({ password, current_password: currentPassword })
      if (error) throw error
      setPassword(''); setCurrentPassword(''); setConfirmation(''); setEditing(null); setMessage('Votre mot de passe a été modifié.')
    })
  }
  async function logout() {
    await perform('logout', async () => {
      const { error } = await createClient().auth.signOut({ scope: 'local' })
      if (error) throw error
      router.replace('/login'); router.refresh()
    })
  }
  const disabled = loading || busy !== null
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return <div className="account-ui">
    <nav className="account-breadcrumb" aria-label="Fil d’Ariane"><Link href="/dashboard" aria-label="Tableau de bord"><House size={15}/></Link><ChevronRight size={14}/><span>Mon compte</span></nav>
    <header className="account-heading"><h1>Mon compte</h1><p>Gérez votre profil et vos informations de connexion.</p></header>
    <section className="account-identity" aria-label="Votre compte"><span className="account-avatar">{initials || <UserRound/>}</span><div><h2>{loading ? 'Chargement…' : displayName || 'Votre compte'}</h2><p>{email}</p><small>Compte propriétaire</small></div></section>
    {error && <p className="account-alert error" role="alert">{error}</p>}
    {message && <p className="account-alert success" role="status">{message}</p>}
    <div className="account-grid">
      <section className="account-card account-profile"><div className="account-card-title"><span className="account-icon"><UserRound/></span><div><h2>Profil de connexion</h2><p>Ces informations identifient votre compte.</p></div></div>
        <form onSubmit={saveProfile}><label htmlFor="account-first">Prénom</label><input id="account-first" autoComplete="given-name" value={firstName} disabled={disabled} onChange={e=>setFirstName(e.target.value)}/><label htmlFor="account-last">Nom</label><input id="account-last" autoComplete="family-name" value={lastName} disabled={disabled} onChange={e=>setLastName(e.target.value)}/><button className="account-primary" disabled={disabled}><Pencil size={18}/>{busy === 'profile' ? 'Enregistrement…' : 'Enregistrer les modifications'}</button></form>
      </section>
      <section className="account-card account-email"><div className="account-card-title"><span className="account-icon"><Mail/></span><div><h2>Adresse e-mail de connexion</h2><p>Votre identifiant pour accéder à l’application. Le mail affiché sur les quittances se règle séparément.</p></div></div><div className="account-readonly">{email || '—'}</div>
        {pendingEmail && <p className="account-pending">Confirmation en attente : {pendingEmail}</p>}
        {editing === 'email' ? <form onSubmit={saveEmail} className="account-editor"><label htmlFor="account-email">Nouvelle adresse e-mail</label><input id="account-email" type="email" autoComplete="email" required disabled={disabled} value={nextEmail} onChange={e=>setNextEmail(e.target.value)}/><p>Ce changement concerne uniquement la connexion. L’adresse figurant sur vos documents reste dans les Paramètres.</p><button className="account-primary" disabled={disabled}><Mail size={18}/>{busy === 'email' ? 'Envoi…' : 'Demander le changement'}</button><button type="button" className="account-cancel" disabled={disabled} onClick={()=>openEditor(null)}><ArrowLeft size={15}/> Annuler</button></form> : <><button className="account-outline" disabled={disabled} onClick={()=>openEditor('email')}><Mail size={19}/>Modifier mon adresse de connexion</button><p className="account-note">Une confirmation sera demandée.</p></>}
      </section>
      <section className="account-card account-password"><div className="account-card-title"><span className="account-icon"><LockKeyhole/></span><div><h2>Mot de passe</h2>{editing !== 'password' && <div className="account-readonly"><span aria-hidden="true">••••••••••</span><small>Mot de passe masqué</small></div>}</div></div>
        {editing === 'password' ? <form onSubmit={savePassword} className="account-editor"><label htmlFor="account-current">Mot de passe actuel</label><input id="account-current" type="password" autoComplete="current-password" required disabled={disabled} value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/><label htmlFor="account-new">Nouveau mot de passe</label><div className="account-password-field"><input id="account-new" type={showPassword?'text':'password'} autoComplete="new-password" required minLength={8} disabled={disabled} value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" aria-label={showPassword?'Masquer le nouveau mot de passe':'Afficher le nouveau mot de passe'} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div><label htmlFor="account-confirm">Confirmer le nouveau mot de passe</label><input id="account-confirm" type="password" autoComplete="new-password" required minLength={8} disabled={disabled} value={confirmation} onChange={e=>setConfirmation(e.target.value)}/><p>Au moins 8 caractères. Si une reconnexion est demandée, reconnectez-vous avant de réessayer.</p><button className="account-primary" disabled={disabled}><LockKeyhole size={18}/>{busy === 'password'?'Enregistrement…':'Enregistrer le mot de passe'}</button><button type="button" className="account-cancel" disabled={disabled} onClick={()=>openEditor(null)}><ArrowLeft size={15}/> Annuler</button></form> : <button className="account-outline" disabled={disabled} onClick={()=>openEditor('password')}><LockKeyhole size={18}/>Modifier mon mot de passe</button>}
      </section>
    </div>
    <PublicContactEmail/>
    <RecoveryEmail/>
    <section className="account-card account-row"><span className="account-icon"><SlidersHorizontal/></span><div><h2>Réglages de l’application</h2><p>Coordonnées du bailleur, signature, documents et notifications.</p></div><Link className="account-outline" href="/dashboard/parametres"><SlidersHorizontal size={18}/>Ouvrir les paramètres<ChevronRight size={17}/></Link></section>
    <section className="account-card account-row account-logout"><span className="account-icon"><LogOut/></span><div><h2>Connexion</h2><p>Fermez votre session sur cet appareil.</p></div><button className="account-outline" disabled={disabled} onClick={logout}><LogOut size={18}/>{busy==='logout'?'Déconnexion…':'Se déconnecter'}</button></section>
    <aside className="account-help"><CircleHelp size={22}/><strong>Besoin d’aide ?</strong><span>Retrouvez vos réglages et les conseils de continuité d’accès.</span><Link href="/dashboard/parametres">Consulter l’aide<ChevronRight size={17}/></Link></aside>
  </div>
}
