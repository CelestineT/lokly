'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('Email ou mot de passe incorrect.')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setSuccess('Vérifiez votre boîte mail pour confirmer votre compte.')
      }
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#f1f7fd] text-[#080d49] lg:grid lg:grid-cols-[minmax(380px,46%)_1fr]">
      <section className="relative overflow-hidden bg-[#08075a] px-6 pt-10 pb-16 text-white sm:px-12 lg:min-h-screen lg:flex lg:flex-col lg:justify-between lg:px-16 lg:py-16">
        <div className="relative z-10 mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
          <img src="/ekolocs-logo.jpeg" alt="Ekolocs, parc immobilier" className="mx-auto h-auto w-52 rounded-lg bg-white p-2 lg:mx-0 lg:w-64" />
          <h1 className="mt-9 text-3xl font-bold leading-tight sm:text-4xl lg:mt-14 lg:text-5xl">Votre parc immobilier,<br />en toute clarté.</h1>
          <p className="mt-5 hidden max-w-lg text-lg text-blue-100 lg:block">Retrouvez vos biens, vos locataires et votre suivi financier dans un même espace.</p>
        </div>
        <div className="hidden border-t border-blue-300/40 pt-8 text-sm text-blue-100 lg:flex lg:gap-10"><span>⌂ &nbsp; Biens</span><span>▥ &nbsp; Loyers</span><span>▤ &nbsp; Documents</span></div>
      </section>
      <section className="relative -mt-8 px-4 pb-12 lg:mt-0 lg:flex lg:min-h-screen lg:flex-col lg:justify-center lg:px-12">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(25,53,105,0.08)] sm:p-9">
          <p className="mb-2 text-sm font-semibold text-indigo-500">Bienvenue sur Ekolocs</p>
          <h2 className="text-2xl font-bold sm:text-3xl">{mode === 'login' ? 'Connectez-vous à votre espace' : 'Créer un compte'}</h2>
          <p className="mt-2 text-sm text-slate-500">{mode === 'login' ? 'Saisissez vos identifiants pour accéder à votre parc.' : 'Commencez à gérer vos biens.'}</p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div><label htmlFor="login-email" className="mb-2 block text-sm font-medium">Adresse e-mail</label><input id="login-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="vous@exemple.fr" className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div>
            <div><label htmlFor="login-password" className="mb-2 block text-sm font-medium">Mot de passe</label><div className="relative"><input id="login-password" type={showPassword?'text':'password'} autoComplete={mode==='login'?'current-password':'new-password'} required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-lg border border-slate-300 py-3 pl-4 pr-24 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Masquer le mot de passe':'Afficher le mot de passe'} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-blue-700">{showPassword?'Masquer':'Afficher'}</button></div></div>
            {error && <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {success && <p role="status" className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-[#1000c5] px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60">{loading?'Chargement…':mode==='login'?'Se connecter':'Créer mon compte'} <span aria-hidden="true">→</span></button>
          </form>
          <div className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-500">{mode==='login'?<>Pas encore de compte ? <button type="button" onClick={()=>{setMode('signup');setError(null);setSuccess(null)}} className="font-medium text-blue-700 underline">S’inscrire</button></>:<>Déjà un compte ? <button type="button" onClick={()=>{setMode('login');setError(null);setSuccess(null)}} className="font-medium text-blue-700 underline">Se connecter</button></>}</div>
        </div>
        <div className="mx-auto mt-8 text-center text-sm"><a href="https://ekolocs.fr" className="font-medium text-blue-700 underline">Retour au site Ekolocs ↗</a></div>
      </section>
    </main>
  )
}
