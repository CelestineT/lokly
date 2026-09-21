'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ajouterLocataire } from './actions'

type Bien = { id: string; nom: string; ville: string }

export default function NouveauLocatairePage() {
  const [biens, setBiens] = useState<Bien[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loyerHc, setLoyerHc] = useState(0)
  const [charges, setCharges] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('biens').select('id, nom, ville').then(({ data }) => {
      setBiens(data ?? [])
    })
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = await ajouterLocataire(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/locataires" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Retour aux locataires
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Ajouter un locataire</h1>
        <p className="text-slate-500 text-sm mt-1">Renseignez les informations du locataire.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bien concerné <span className="text-red-500">*</span></label>
            <select name="bien_id" required defaultValue="" className={inputClass + " bg-white"}>
              <option value="" disabled>Choisir un bien…</option>
              {biens.map(b => <option key={b.id} value={b.id}>{b.nom} — {b.ville}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet <span className="text-red-500">*</span></label>
              <input name="nom" type="text" required placeholder="Ex : Marie Dupont" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
              <input name="email" type="email" required placeholder="marie@email.com" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
              <input name="telephone" type="text" placeholder="06 00 00 00 00" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date d&apos;entrée <span className="text-red-500">*</span></label>
              <input name="date_entree" type="date" required className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Loyer HC (€) <span className="text-red-500">*</span></label>
              <input name="loyer_hc" type="number" required min="0" step="0.01" placeholder="800"
                className={inputClass} onChange={e => setLoyerHc(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Charges (€)</label>
              <input name="charges" type="number" min="0" step="0.01" placeholder="50" defaultValue="0"
                className={inputClass} onChange={e => setCharges(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Caution (€)</label>
              <input name="caution" type="number" min="0" step="0.01" placeholder="1600" className={inputClass} />
            </div>
          </div>

          {(loyerHc > 0 || charges > 0) && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700 font-medium">
              Loyer CC : {(loyerHc + charges).toLocaleString('fr-FR')} €
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Durée du bail (ans)</label>
              <input name="duree_bail_ans" type="number" min="1" defaultValue="3" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mode de paiement</label>
              <input name="mode_paiement" type="text" defaultValue="Avant le 5" className={inputClass} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input name="caution_payee" id="caution_payee" type="checkbox" className="rounded border-slate-300 text-blue-600" />
            <label htmlFor="caution_payee" className="text-sm text-slate-700">Caution déjà reçue</label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Commentaire</label>
            <textarea name="commentaire" rows={3} placeholder="Notes libres…"
              className={inputClass + " resize-none"} />
          </div>

          {error && <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">{error}</div>}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
              {loading ? 'Enregistrement…' : 'Enregistrer le locataire'}
            </button>
            <Link href="/dashboard/locataires" className="text-sm text-slate-500 hover:text-slate-800 px-3 py-2">Annuler</Link>
          </div>
        </form>
      </div>
    </div>
  )
}