'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ajouterDepense } from './actions'

type Bien = {
  id: string
  nom: string
  ville: string
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function NouvelleDepensePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [biens, setBiens] = useState<Bien[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('biens').select('id, nom, ville').order('nom').then(({ data }) => {
      if (data) setBiens(data)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = await ajouterDepense(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1'

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/depenses"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Retour aux dépenses
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Nouvelle dépense</h1>
        <p className="text-slate-500 text-sm mt-1">Enregistrez une dépense liée à vos biens.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Bien (optionnel) */}
          <div>
            <label htmlFor="bien_id" className={labelClass}>Bien concerné</label>
            <select
              id="bien_id"
              name="bien_id"
              defaultValue=""
              className={`${inputClass} bg-white`}
            >
              <option value="">Tous les biens / non lié</option>
              {biens.map((b) => (
                <option key={b.id} value={b.id}>{b.nom} — {b.ville}</option>
              ))}
            </select>
          </div>

          {/* Catégorie */}
          <div>
            <label htmlFor="categorie" className={labelClass}>
              Catégorie <span className="text-red-500">*</span>
            </label>
            <select
              id="categorie"
              name="categorie"
              required
              defaultValue=""
              className={`${inputClass} bg-white`}
            >
              <option value="" disabled>Choisir…</option>
              <option value="travaux">Travaux</option>
              <option value="charges">Charges</option>
              <option value="assurance">Assurance</option>
              <option value="gestion">Gestion</option>
              <option value="taxe">Taxe</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          {/* Montant + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="montant" className={labelClass}>
                Montant (€) <span className="text-red-500">*</span>
              </label>
              <input
                id="montant"
                name="montant"
                type="number"
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="date_depense" className={labelClass}>
                Date <span className="text-red-500">*</span>
              </label>
              <input
                id="date_depense"
                name="date_depense"
                type="date"
                required
                defaultValue={todayStr()}
                className={inputClass}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className={labelClass}>Description</label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Détails de la dépense…"
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Déductible */}
          <div className="flex items-center gap-2.5">
            <input
              id="deductible_fiscalement"
              name="deductible_fiscalement"
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="deductible_fiscalement" className="text-sm font-medium text-slate-700 cursor-pointer">
              Déductible fiscalement
            </label>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Enregistrement…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Enregistrer la dépense
                </>
              )}
            </button>
            <Link
              href="/dashboard/depenses"
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors px-3 py-2"
            >
              Annuler
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}