'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ajouterBien } from './actions'

const ANNEXES_OPTIONS = [
  { value: 'cave', label: 'Cave' },
  { value: 'parking', label: 'Parking' },
  { value: 'garage', label: 'Garage' },
  { value: 'cour', label: 'Cour' },
  { value: 'jardin', label: 'Jardin' },
  { value: 'grenier', label: 'Grenier' },
  { value: 'terrasse', label: 'Terrasse' },
  { value: 'balcon', label: 'Balcon' },
]

export default function NouveauBienPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [typeBien, setTypeBien] = useState('')
  const [annexes, setAnnexes] = useState<string[]>([])

  function toggleAnnexe(value: string) {
    setAnnexes(prev =>
      prev.includes(value) ? prev.filter(a => a !== value) : [...prev, value]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    annexes.forEach(a => formData.append('annexes', a))
    const result = await ajouterBien(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  const isImmeuble = typeBien === 'immeuble' || typeBien === 'immeuble_rapport'

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/biens" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Retour à mes biens
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Ajouter un bien</h1>
        <p className="text-slate-500 text-sm mt-1">Renseignez les informations de votre bien immobilier.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="nom" className="block text-sm font-medium text-slate-700 mb-1">Nom du bien <span className="text-red-500">*</span></label>
            <input id="nom" name="nom" type="text" required placeholder="Ex : Appartement Paris 11e"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label htmlFor="adresse" className="block text-sm font-medium text-slate-700 mb-1">Adresse <span className="text-red-500">*</span></label>
            <input id="adresse" name="adresse" type="text" required placeholder="Ex : 12 rue de la Paix"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ville" className="block text-sm font-medium text-slate-700 mb-1">Ville <span className="text-red-500">*</span></label>
              <input id="ville" name="ville" type="text" required placeholder="Ex : Paris"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label htmlFor="code_postal" className="block text-sm font-medium text-slate-700 mb-1">Code postal <span className="text-red-500">*</span></label>
              <input id="code_postal" name="code_postal" type="text" required placeholder="Ex : 75011"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-1">Type de bien <span className="text-red-500">*</span></label>
              <select id="type" name="type" required defaultValue=""
                onChange={e => setTypeBien(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="" disabled>Choisir…</option>
                <option value="appartement">Appartement</option>
                <option value="maison">Maison</option>
                <option value="studio">Studio</option>
                <option value="immeuble">Immeuble</option>
                <option value="immeuble_rapport">Immeuble de rapport</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label htmlFor="type_location" className="block text-sm font-medium text-slate-700 mb-1">Type de location <span className="text-red-500">*</span></label>
              <select id="type_location" name="type_location" required defaultValue=""
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="" disabled>Choisir…</option>
                <option value="meuble">Meublé</option>
                <option value="non_meuble">Non meublé</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="surface_m2" className="block text-sm font-medium text-slate-700 mb-1">Surface (m²)</label>
              <input id="surface_m2" name="surface_m2" type="number" min="1" step="0.01" placeholder="Ex : 45"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label htmlFor="nb_pieces" className="block text-sm font-medium text-slate-700 mb-1">Nb de pièces</label>
              <input id="nb_pieces" name="nb_pieces" type="number" min="1" step="1" placeholder="Ex : 3"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label htmlFor="prix_achat" className="block text-sm font-medium text-slate-700 mb-1">Prix d&apos;achat (€)</label>
              <input id="prix_achat" name="prix_achat" type="number" min="0" step="1" placeholder="Ex : 250000"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {isImmeuble && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="surface_totale_m2" className="block text-sm font-medium text-slate-700 mb-1">Surface totale (m²)</label>
                <input id="surface_totale_m2" name="surface_totale_m2" type="number" min="1" step="0.01" placeholder="Ex : 350"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label htmlFor="nb_lots" className="block text-sm font-medium text-slate-700 mb-1">Nombre de lots</label>
                <input id="nb_lots" name="nb_lots" type="number" min="1" step="1" placeholder="Ex : 6"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}

          <div>
            <p className="block text-sm font-medium text-slate-700 mb-2">Annexes</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ANNEXES_OPTIONS.map(opt => (
                <label key={opt.value} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-sm transition-colors ${
                  annexes.includes(opt.value)
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}>
                  <input type="checkbox" className="hidden" checked={annexes.includes(opt.value)}
                    onChange={() => toggleAnnexe(opt.value)} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">{error}</div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
              {loading ? 'Enregistrement…' : 'Enregistrer le bien'}
            </button>
            <Link href="/dashboard/biens" className="text-sm text-slate-500 hover:text-slate-800 px-3 py-2">Annuler</Link>
          </div>
        </form>
      </div>
    </div>
  )
}