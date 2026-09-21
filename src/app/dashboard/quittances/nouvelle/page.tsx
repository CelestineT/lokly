'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { creerQuittance } from './actions'

type Locataire = {
  id: string
  nom: string
  bien_id: string
  loyer_hc: number
  charges: number
  actif: boolean
}

type Bien = {
  id: string
  nom: string
  ville: string
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function currentMonthStr() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export default function NouvelleQuittancePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locataires, setLocataires] = useState<Locataire[]>([])
  const [biens, setBiens] = useState<Bien[]>([])
  const [loyerHc, setLoyerHc] = useState(0)
  const [charges, setCharges] = useState(0)
  const [solde, setSolde] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('locataires').select('id, nom, bien_id, loyer_hc, charges, actif').eq('actif', true).order('nom'),
      supabase.from('biens').select('id, nom, ville').order('nom'),
    ]).then(([{ data: locs }, { data: bs }]) => {
      if (locs) setLocataires(locs)
      if (bs) setBiens(bs)
    })
  }, [])

  const biensMap = new Map(biens.map((b) => [b.id, b]))

  function handleLocataireChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const loc = locataires.find((l) => l.id === e.target.value)
    if (loc) {
      setLoyerHc(loc.loyer_hc)
      setCharges(loc.charges)
    } else {
      setLoyerHc(0)
      setCharges(0)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = await creerQuittance(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  const total = loyerHc + charges + solde
  const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1'

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/quittances" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Retour aux quittances
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Nouvelle quittance</h1>
        <p className="text-slate-500 text-sm mt-1">Générez une quittance de loyer pour un locataire.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="locataire_id" className={labelClass}>Locataire <span className="text-red-500">*</span></label>
            <select id="locataire_id" name="locataire_id" required defaultValue="" className={`${inputClass} bg-white`} onChange={handleLocataireChange}>
              <option value="" disabled>Sélectionner un locataire…</option>
              {locataires.map((l) => {
                const bien = biensMap.get(l.bien_id)
                return <option key={l.id} value={l.id}>{l.nom}{bien ? ` — ${bien.ville}` : ''}</option>
              })}
            </select>
          </div>

          <div>
            <label htmlFor="mois" className={labelClass}>Mois <span className="text-red-500">*</span></label>
            <input id="mois" name="mois" type="month" required defaultValue={currentMonthStr()} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="loyer_hc" className={labelClass}>Loyer hors charges (€) <span className="text-red-500">*</span></label>
              <input id="loyer_hc" name="loyer_hc" type="number" required min="0" step="0.01" value={loyerHc} className={inputClass} onChange={(e) => setLoyerHc(Number(e.target.value) || 0)} />
            </div>
            <div>
              <label htmlFor="charges" className={labelClass}>Charges (€) <span className="text-red-500">*</span></label>
              <input id="charges" name="charges" type="number" required min="0" step="0.01" value={charges} className={inputClass} onChange={(e) => setCharges(Number(e.target.value) || 0)} />
            </div>
          </div>

          <div>
            <label htmlFor="solde" className={labelClass}>Solde dû (€)</label>
            <input id="solde" name="solde" type="number" step="0.01" defaultValue={0} className={inputClass} onChange={(e) => setSolde(Number(e.target.value) || 0)} />
          </div>

          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-blue-700 font-medium">Total :</span>
            <span className="text-base font-bold text-blue-800">{total.toLocaleString('fr-FR')} €</span>
          </div>

          <div>
            <label htmlFor="date_signature" className={labelClass}>Date de signature <span className="text-red-500">*</span></label>
            <input id="date_signature" name="date_signature" type="date" required defaultValue={todayStr()} className={inputClass} />
          </div>

          <div className="flex items-center gap-2.5">
            <input id="caution_affichee" name="caution_affichee" type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="caution_affichee" className="text-sm font-medium text-slate-700 cursor-pointer">Afficher la caution sur la quittance</label>
          </div>

          <div>
            <label htmlFor="commentaire" className={labelClass}>Commentaire</label>
            <textarea id="commentaire" name="commentaire" rows={3} placeholder="Notes complémentaires…" className={`${inputClass} resize-none`} />
          </div>

          {error && <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">{error}</div>}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (
                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Enregistrement…</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Créer la quittance</>
              )}
            </button>
            <Link href="/dashboard/quittances" className="text-sm text-slate-500 hover:text-slate-800 transition-colors px-3 py-2">Annuler</Link>
          </div>
        </form>
      </div>
    </div>
  )
}