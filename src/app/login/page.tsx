'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

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
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <span className="font-display font-bold text-2xl text-blue-600">Lokly</span>
          </div>
          <p className="text-sm text-slate-500">Gestion locative simplifiée</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h1 className="font-display font-semibold text-lg text-slate-900 mb-1">
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </h1>
          <p className="text-sm text-slate-500 mb-5">
            {mode === 'login'
              ? 'Accédez à votre espace propriétaire'
              : 'Commencez à gérer vos biens gratuitement'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}
            {success && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{success}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-60"
            >
              {loading ? 'Chargement…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-500">
            {mode === 'login' ? (
              <>Pas encore de compte ?{' '}
                <button onClick={() => { setMode('signup'); setError(null) }} className="text-blue-600 font-medium hover:underline">
                  S'inscrire
                </button>
              </>
            ) : (
              <>Déjà un compte ?{' '}
                <button onClick={() => { setMode('login'); setError(null) }} className="text-blue-600 font-medium hover:underline">
                  Se connecter
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
