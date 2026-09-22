'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ajouterBien } from './actions'

const ANNEXES_IMMEUBLE = [
  { value: 'cour', label: 'Cour' },
  { value: 'garage_commun', label: 'Garage commun' },
  { value: 'cave_commune', label: 'Cave commune' },
  { value: 'parking_commun', label: 'Parking commun' },
]

const ANNEXES_LOT = [
  { value: 'cave_privative', label: 'Cave privative' },
  { value: 'parking_privatif', label: 'Parking privatif' },
  { value: 'balcon', label: 'Balcon' },
  { value: 'terrasse', label: 'Terrasse' },
  { value: 'grenier', label: 'Grenier' },
]

const ANNEXES_BIEN = [
  { value: 'cave', label: 'Cave' },
  { value: 'parking', label: 'Parking' },
  { value: 'garage', label: 'Garage' },
  { value: 'cour', label: 'Cour' },
  { value: 'jardin', label: 'Jardin' },
  { value: 'grenier', label: 'Grenier' },
  { value: 'terrasse', label: 'Terrasse' },
  { value: 'balcon', label: 'Balcon' },
]

type Lot = {
  surface_m2: string
  nb_pieces: string
  type_location: string
  annexes: string[]
}

function defaultLot(): Lot {
  return { surface_m2: '', nb_pieces: '', type_location: '', annexes: [] }
}

function AnnexesPicker({ options, selected, onChange }: {
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter(a => a !== value) : [...selected, value])
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {options.map(opt => (
        <label key={opt.value} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-sm transition-colors ${
          selected.includes(opt.value)
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-slate-200 text-slate-600 hover:border-slate-300'
        }`}>
          <input type="checkbox" className="hidden" checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)} />
          {opt.label}
        </label>
      ))}
    </div>
  )
}

export default function NouveauBienPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [typeBien, setTypeBien] = useState('')
  const [annexes, setAnnexes] = useState<string[]>([])
  const [nbLots, setNbLots] = useState(0)
  const [lots, setLots] = useState<Lot[]>([])

  const isImmeubleRapport = typeBien === 'immeuble_rapport'
  const isImmeuble = typeBien === 'immeuble' || isImmeubleRapport

  function handleNbLots(val: string) {
    const n = parseInt(val) || 0
    setNbLots(n)
    setLots(prev => {
      if (n > prev.length) return [...prev, ...Array(n - prev.length).fill(null).map(defaultLot)]
      return prev.slice(0, n)
    })
  }

  function updateLot(index: number, field: keyof Lot, value: string | string[]) {
    setLots(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    annexes.forEach(a => formData.append('annexes', a))
    formData.append('lots_json', JSON.stringify(lots))
    const result = await ajouterBien(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

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

          {/* Nom */}
          <div>
            <label htmlFor="nom" className="block text-sm font-medium text-slate-700 mb-1">Nom du bien <span className="text-red-500">*</span></label>
            <input id="nom" name="nom" type="text" required placeholder="Ex : Immeuble rue Victor Hugo"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Adresse */}
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

          {/* Type de bien */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-1">Type de bien <span className="text-red-500">*</span></label>
              <select id="type" name="type" required defaultValue=""
                onChange={e => { setTypeBien(e.target.value); setAnnexes([]); setLots([]); setNbLots(0) }}
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
                {isImmeubleRapport && <option value="mixte">Mixte</option>}
              </select>
            </div>
          </div>

          {/* Champs communs */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="surface_m2" className="block text-sm font-medium text-slate-700 mb-1">
                {isImmeuble ? 'Surface totale (m²)' : 'Surface (m²)'}
              </label>
              <input id="surface_m2" name="surface_m2" type="number" min="1" step="0.01" placeholder="Ex : 45"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {!isImmeubleRapport && (
              <div>
                <label htmlFor="nb_pieces" className="block text-sm font-medium text-slate-700 mb-1">Nb de pièces</label>
                <input id="nb_pieces" name="nb_pieces" type="number" min="1" step="1" placeholder="Ex : 3"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <div>
              <label htmlFor="prix_achat" className="block text-sm font-medium text-slate-700 mb-1">Prix d&apos;achat (€)</label>
              <input id="prix_achat" name="prix_achat" type="number" min="0" step="1" placeholder="Ex : 250000"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Nombre de lots pour immeuble de rapport */}
          {isImmeubleRapport && (
            <div>
              <label htmlFor="nb_lots" className="block text-sm font-medium text-slate-700 mb-1">Nombre de lots <span className="text-red-500">*</span></label>
              <input id="nb_lots" name="nb_lots" type="number" min="1" max="20" step="1" placeholder="Ex : 5"
                value={nbLots || ''}
                onChange={e => handleNbLots(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}

          {/* Annexes */}
          <div>
            <p className="block text-sm font-medium text-slate-700 mb-2">
              {isImmeubleRapport ? 'Annexes communes de l\'immeuble' : 'Annexes'}
            </p>
            <AnnexesPicker
              options={isImmeubleRapport ? ANNEXES_IMMEUBLE : ANNEXES_BIEN}
              selected={annexes}
              onChange={setAnnexes}
            />
          </div>

          {/* Formulaires des lots */}
          {isImmeubleRapport && lots.length > 0 && (
            <div className="space-y-4 pt-2">
              <h2 className="text-base font-semibold text-slate-800 border-t pt-4">Détail des lots</h2>
              {lots.map((lot, i) => (
                <div key={i} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700">Lot {i + 1}</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Surface (m²) <span className="text-red-500">*</span></label>
                      <input type="number" min="1" step="0.01" required placeholder="Ex : 35"
                        value={lot.surface_m2}
                        onChange={e => updateLot(i, 'surface_m2', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Nb pièces <span className="text-red-500">*</span></label>
                      <input type="number" min="1" step="1" required placeholder="Ex : 2"
                        value={lot.nb_pieces}
                        onChange={e => updateLot(i, 'nb_pieces', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Location <span className="text-red-500">*</span></label>
                      <select required value={lot.type_location}
                        onChange={e => updateLot(i, 'type_location', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="">Choisir…</option>
                        <option value="meuble">Meublé</option>
                        <option value="non_meuble">Non meublé</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1.5">Annexes du lot</p>
                    <AnnexesPicker
                      options={ANNEXES_LOT}
                      selected={lot.annexes}
                      onChange={v => updateLot(i, 'annexes', v)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

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