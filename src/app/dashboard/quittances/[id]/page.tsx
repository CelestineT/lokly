'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Quittance = {
  id: string
  locataire_id: string
  bien_id: string | null
  mois: string
  loyer_hc: number
  charges: number
  solde: number
  total: number
  envoyee: boolean
  date_signature: string
  locataires: { nom: string; email: string } | null
  biens: { nom: string; adresse: string; ville: string } | null
}

function formatMois(mois: string): string {
  const [year, month] = mois.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    .replace(/^./, (c) => c.toUpperCase())
}

export default function QuittanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [quittance, setQuittance] = useState<Quittance | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [resolvedId, setResolvedId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => {
      setResolvedId(id)
      const supabase = createClient()
      supabase
        .from('quittances')
        .select('*, locataires(nom, email), biens(nom, adresse, ville)')
        .eq('id', id)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            setNotFound(true)
          } else {
            setQuittance(data)
          }
          setLoading(false)
        })
    })
  }, [params])

  async function handleEnvoyer() {
    if (!resolvedId) return
    setSending(true)
    setMessage(null)
    try {
      const res = await fetch('/api/youtrust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quittanceId: resolvedId }),
      })
      const data = await res.json()
      if (res.ok) {
        setQuittance((prev) => prev ? { ...prev, envoyee: true } : prev)
        setMessage({ text: 'Envoyée pour signature !', ok: true })
      } else {
        setMessage({ text: data.error ?? 'Erreur lors de l\'envoi', ok: false })
      }
    } catch {
      setMessage({ text: 'Erreur réseau', ok: false })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-100 rounded w-1/3" />
          <div className="h-48 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (notFound || !quittance) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 flex flex-col items-center text-center">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Quittance introuvable</h2>
          <Link href="/dashboard/quittances" className="text-blue-600 text-sm hover:underline mt-4">
            ← Retour aux quittances
          </Link>
        </div>
      </div>
    )
  }

  const locataire = quittance.locataires
  const bien = quittance.biens

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/quittances" className="text-slate-400 hover:text-slate-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quittance de loyer</h1>
          <p className="text-slate-500 text-sm">{formatMois(quittance.mois)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
        {/* Statut */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Statut</span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${quittance.envoyee ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {quittance.envoyee ? '✓ Envoyée pour signature' : 'À envoyer'}
          </span>
        </div>

        <hr className="border-slate-50" />

        {/* Locataire */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Locataire</p>
          <p className="font-semibold text-slate-900">{locataire?.nom ?? '—'}</p>
          {locataire?.email && <p className="text-sm text-slate-500">{locataire.email}</p>}
        </div>

        {/* Bien */}
        {bien && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Bien loué</p>
            <p className="font-semibold text-slate-900">{bien.nom}</p>
            <p className="text-sm text-slate-500">{bien.adresse}, {bien.ville}</p>
          </div>
        )}

        <hr className="border-slate-50" />

        {/* Détail financier */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Détail du règlement</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Loyer hors charges</span>
              <span className="text-slate-900">{quittance.loyer_hc.toLocaleString('fr-FR')} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Charges</span>
              <span className="text-slate-900">{quittance.charges.toLocaleString('fr-FR')} €</span>
            </div>
            {quittance.solde !== 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Solde</span>
                <span className={quittance.solde < 0 ? 'text-red-600' : 'text-green-600'}>
                  {quittance.solde > 0 ? '+' : ''}{quittance.solde.toLocaleString('fr-FR')} €
                </span>
              </div>
            )}
            <hr className="border-slate-100" />
            <div className="flex justify-between font-bold">
              <span className="text-slate-900">Total</span>
              <span className="text-slate-900">{quittance.total.toLocaleString('fr-FR')} €</span>
            </div>
          </div>
        </div>

        {/* Action */}
        {!quittance.envoyee && (
          <div className="pt-2">
            <button
              onClick={handleEnvoyer}
              disabled={sending}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {sending ? 'Envoi en cours…' : '✉ Envoyer pour signature'}
            </button>
            {message && (
              <p className={`mt-2 text-xs text-center font-medium ${message.ok ? 'text-green-600' : 'text-red-500'}`}>
                {message.text}
              </p>
            )}
          </div>
        )}

        {quittance.envoyee && message && (
          <p className={`text-xs text-center font-medium ${message.ok ? 'text-green-600' : 'text-red-500'}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  )
}
