'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { modifierBien } from './actions'

type Bien = {
  id: string
  nom: string
  adresse: string
  ville: string
  code_postal: string
  type: 'appartement' | 'maison' | 'studio' | 'immeuble' | 'immeuble_rapport' | 'autre'
  type_location: 'meuble' | 'non_meuble' | null
  surface_m2: number | null
  surface_totale_m2: number | null
  nb_pieces: number | null
  nb_lots: number | null
  prix_achat: number | null
  annexes: string[]
}

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

export default function ModifierBienForm({ bien }: { bien: Bien }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState(bien.type)
  const [annexes, setAnnexes] = useState<string[]>(bien.annexes ?? [])

  const isImmeuble = type === 'immeuble' || type === 'immeuble_rapport'

  function toggleAnnexe(value: string) {
    setAnnexes((prev) =>
      prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    // Annexes via hidden inputs (les checkboxes sont gérées en state)
    annexes.forEach((a) => formData.append('annexes', a))
    const result = await modifierBien(bien.id, formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else if (result?.ok) {
      router.push('/dashboard/biens')
    }
  }

  const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1'

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/biens" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Retour à mes biens
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Modifier le bien</h1>
        <p className="text-slate-500 text-sm mt-1">Modifiez les informations de votre bien immobilier.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Nom */}
          <div>
            <label htmlFor="nom" className={labelClass}>Nom du bien <span className="text-red-500">*</span></label>
            <input id="nom" name="nom" type="text" required defaultValue={bien.nom} className={inputClass} />
          </div>

          {/* Adresse */}
          <div>
            <label htmlFor="adresse" className={labelClass}>Adresse <span className="text-red-500">*</span></label>
            <input id="adresse" name="adresse" type="text" required defaultValue={bien.adresse} className={inputClass} />
          </div>

          {/* Ville + CP */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ville" className={labelClass}>Ville <span className="text-red-500">*</span></label>
              <input id="ville" name="ville" type="text" required defaultValue={bien.ville} className={inputClass} />
            </div>
            <div>
              <label htmlFor="code_postal" className={labelClass}>Code postal <span className="text-red-500">*</span></label>
              <input id="code_postal" name="code_postal" type="text" required defaultValue={bien.code_postal} className={inputClass} />
            </div>
          </div>

          {/* Type de bien + Type de location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className={labelClass}>Type de bien <span className="text-red-500">*</span></label>
              <select id="type" name="type" required value={type}
                onChange={(e) => setType(e.target.value as Bien['type'])}
                className={`${inputClass} bg-white`}>
                <option value="appartement">Appartement</option>
                <option value="maison">Maison</option>
                <option value="studio">Studio</option>
                <option value="immeuble">Immeuble</option>
                <option value="immeuble_rapport">Immeuble de rapport</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label htmlFor="type_location" className={labelClass}>Type de location <span className="text-red-500">*</span></label>
              <select id="type_location" name="type_location" required defaultValue={bien.type_location ?? 'non_meuble'}
                className={`${inputClass} bg-white`}>
                <option value="meuble">Meublé</option>
                <option value="non_meuble">Non meublé</option>
              </select>
            </div>
          </div>

          {/* Champs selon type */}
          {isImmeuble ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="surface_totale_m2" className={labelClass}>Surface totale (m²)</label>
                <input id="surface_totale_m2" name="surface_totale_m2" type="number" min="1" step="0.01"
                  defaultValue={bien.surface_totale_m2 ?? ''} className={inputClass} />
              </div>
              <div>
                <label htmlFor="nb_lots" className={labelClass}>Nombre de lots</label>
                <input id="nb_lots" name="nb_lots" type="number" min="1" step="1"
                  defaultValue={bien.nb_lots ?? ''} className={inputClass} />
              </div>
              <div>
                <label htmlFor="prix_achat" className={labelClass}>Prix d&apos;achat (€)</label>
                <input id="prix_achat" name="prix_achat" type="number" min="0" step="1"
                  defaultValue={bien.prix_achat ?? ''} className={inputClass} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="surface_m2" className={labelClass}>Surface (m²)</label>
                <input id="surface_m2" name="surface_m2" type="number" min="1" step="0.01"
                  defaultValue={bien.surface_m2 ?? ''} className={inputClass} />
              </div>
              <div>
                <label htmlFor="nb_pieces" className={labelClass}>Nb de pièces</label>
                <input id="nb_pieces" name="nb_pieces" type="number" min="1" step="1"
                  defaultValue={bien.nb_pieces ?? ''} className={inputClass} />
              </div>
              <div>
                <label htmlFor="prix_achat" className={labelClass}>Prix d&apos;achat (€)</label>
                <input id="prix_achat" name="prix_achat" type="number" min="0" step="1"
                  defaultValue={bien.prix_achat ?? ''} className={inputClass} />
              </div>
            </div>
          )}

          {/* Annexes */}
          <div>
            <label className={labelClass}>Annexes</label>
            <div className="flex flex-wrap gap-2">
              {ANNEXES_OPTIONS.map((opt) => {
                const checked = annexes.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleAnnexe(opt.value)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                      checked
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">{error}</div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
              {loading ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </button>
            <Link href="/dashboard/biens" className="text-sm text-slate-500 hover:text-slate-800 px-3 py-2">Annuler</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
