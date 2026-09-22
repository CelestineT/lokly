'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Locataire = { id: string; nom: string; bien_id: string; loyer_hc: number; charges: number }
type Bien = { id: string; nom: string; ville: string }

function getCurrentMois(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function NouveauPaiementPage() {
  const router = useRouter()
  const [locataires, setLocataires] = useState<Locataire[]>([])
  const [biens, setBiens] = useState<Bien[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    locataire_id: '',
    mois: getCurrentMois(),
    montant: '',
    date_paiement: new Date().toISOString().split('T')[0],
    mode_paiement: 'virement',
    statut: 'recu',
    commentaire: '',
  })

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('locataires').select('id, nom, bien_id, loyer_hc, charges').eq('actif', true),
      supabase.from('biens').select('id, nom, ville'),
    ]).then(([{ data: l }, { data: b }]) => {
      if (l) setLocataires(l)
      if (b) setBiens(b)
    })
  }, [])

  const biensMap = new Map(biens.map((b) => [b.id, b]))

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))

    // Auto-remplir le montant quand on sélectionne un locataire
    if (name === 'locataire_id') {
      const loc = locataires.find((l) => l.id === value)
      if (loc) {
        setForm((prev) => ({ ...prev, locataire_id: value, montant: String(loc.loyer_hc + loc.charges) }))
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Non autorisé'); setSaving(false); return }

    const locataire = locataires.find((l) => l.id === form.locataire_id)

    const { error: err } = await supabase.from('paiements').insert({
      proprietaire_id: user.id,
      locataire_id: form.locataire_id,
      bien_id: locataire?.bien_id ?? '',
      mois: form.mois,
      montant: parseFloat(form.montant),
      date_paiement: form.date_paiement,
      mode_paiement: form.mode_paiement,
      statut: form.statut,
      commentaire: form.commentaire || null,
    })

    if (err) {
      setError(err.message)
      setSaving(false)
    } else {
      router.push('/dashboard/paiements')
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/paiements" className="text-slate-400 hover:text-slate-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Enregistrer un paiement</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">

        {/* Locataire */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Locataire *</label>
          <select name="locataire_id" value={form.locataire_id} onChange={handleChange} required
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Sélectionner un locataire</option>
            {locataires.map((l) => {
              const bien = biensMap.get(l.bien_id)
              return (
                <option key={l.id} value={l.id}>
                  {l.nom}{bien ? ` — ${bien.nom}` : ''}
                </option>
              )
            })}
          </select>
        </div>

        {/* Mois concerné */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Mois concerné *</label>
          <input name="mois" type="month" value={form.mois} onChange={handleChange} required
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <hr className="border-slate-100" />

        {/* Montant et date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Montant reçu (€) *</label>
            <input name="montant" type="number" step="0.01" value={form.montant} onChange={handleChange} required
              placeholder="0"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date de réception *</label>
            <input name="date_paiement" type="date" value={form.date_paiement} onChange={handleChange} required
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Mode et statut */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mode de paiement</label>
            <select name="mode_paiement" value={form.mode_paiement} onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="virement">Virement</option>
              <option value="prelevement">Prélèvement</option>
              <option value="cheque">Chèque</option>
              <option value="especes">Espèces</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
            <select name="statut" value={form.statut} onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="recu">Reçu</option>
              <option value="partiel">Partiel</option>
              <option value="en_retard">En retard</option>
            </select>
          </div>
        </div>

        {/* Commentaire */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Commentaire</label>
          <textarea name="commentaire" value={form.commentaire} onChange={handleChange} rows={2}
            placeholder="Ex : paiement en deux fois, chèque en attente..."
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Link href="/dashboard/paiements"
            className="flex-1 text-center border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors">
            Annuler
          </Link>
          <button type="submit" disabled={saving}
            className="flex-1 bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
