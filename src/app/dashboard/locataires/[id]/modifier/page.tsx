'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Bien = { id: string; nom: string; ville: string }

export default function ModifierLocatairePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [biens, setBiens] = useState<Bien[]>([])
  const [resolvedId, setResolvedId] = useState<string | null>(null)

  const [form, setForm] = useState({
    nom: '',
    email: '',
    telephone: '',
    bien_id: '',
    date_entree: '',
    date_sortie: '',
    loyer_hc: '',
    charges: '',
    caution: '',
    caution_payee: false,
    mode_paiement: 'virement',
    duree_bail_ans: '3',
    resilitation_anticipee: false,
    commentaire: '',
    actif: true,
  })

  useEffect(() => {
    params.then(({ id }) => {
      setResolvedId(id)
      const supabase = createClient()
      Promise.all([
        supabase.from('locataires').select('*').eq('id', id).single(),
        supabase.from('biens').select('id, nom, ville'),
      ]).then(([{ data: loc }, { data: b }]) => {
        if (loc) {
          setForm({
            nom: loc.nom ?? '',
            email: loc.email ?? '',
            telephone: loc.telephone ?? '',
            bien_id: loc.bien_id ?? '',
            date_entree: loc.date_entree ?? '',
            date_sortie: loc.date_sortie ?? '',
            loyer_hc: String(loc.loyer_hc ?? ''),
            charges: String(loc.charges ?? ''),
            caution: String(loc.caution ?? ''),
            caution_payee: loc.caution_payee ?? false,
            mode_paiement: loc.mode_paiement ?? 'virement',
            duree_bail_ans: String(loc.duree_bail_ans ?? '3'),
            resilitation_anticipee: loc.resilitation_anticipee ?? false,
            commentaire: loc.commentaire ?? '',
            actif: loc.actif ?? true,
          })
        }
        if (b) setBiens(b)
        setLoading(false)
      })
    })
  }, [params])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!resolvedId) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error: err } = await supabase
      .from('locataires')
      .update({
        nom: form.nom,
        email: form.email,
        telephone: form.telephone || null,
        bien_id: form.bien_id,
        date_entree: form.date_entree,
        date_sortie: form.date_sortie || null,
        loyer_hc: parseFloat(form.loyer_hc),
        charges: parseFloat(form.charges),
        caution: parseFloat(form.caution),
        caution_payee: form.caution_payee,
        mode_paiement: form.mode_paiement,
        duree_bail_ans: parseInt(form.duree_bail_ans),
        resilitation_anticipee: form.resilitation_anticipee,
        commentaire: form.commentaire || null,
        actif: form.actif,
      })
      .eq('id', resolvedId)

    if (err) {
      setError(err.message)
      setSaving(false)
    } else {
      router.push('/dashboard/locataires')
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-100 rounded w-1/3" />
          <div className="h-96 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/locataires" className="text-slate-400 hover:text-slate-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Modifier le locataire</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">

        {/* Identité */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Identité</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet *</label>
              <input name="nom" value={form.nom} onChange={handleChange} required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
              <input name="telephone" value={form.telephone} onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Bien loué */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Bien loué</p>
          <select name="bien_id" value={form.bien_id} onChange={handleChange} required
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Sélectionner un bien</option>
            {biens.map((b) => (
              <option key={b.id} value={b.id}>{b.nom} — {b.ville}</option>
            ))}
          </select>
        </div>

        <hr className="border-slate-100" />

        {/* Bail */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Bail</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date d'entrée *</label>
              <input name="date_entree" type="date" value={form.date_entree} onChange={handleChange} required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date de sortie</label>
              <input name="date_sortie" type="date" value={form.date_sortie} onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Durée du bail (ans)</label>
              <input name="duree_bail_ans" type="number" min="1" value={form.duree_bail_ans} onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
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
          </div>
          <div className="flex items-center gap-6 mt-3">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" name="resilitation_anticipee" checked={form.resilitation_anticipee} onChange={handleChange}
                className="rounded" />
              Résiliation anticipée possible
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" name="actif" checked={form.actif} onChange={handleChange}
                className="rounded" />
              Locataire actif
            </label>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Finances */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Finances</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Loyer HC (€) *</label>
              <input name="loyer_hc" type="number" step="0.01" value={form.loyer_hc} onChange={handleChange} required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Charges (€) *</label>
              <input name="charges" type="number" step="0.01" value={form.charges} onChange={handleChange} required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Caution (€)</label>
              <input name="caution" type="number" step="0.01" value={form.caution} onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mt-3">
            <input type="checkbox" name="caution_payee" checked={form.caution_payee} onChange={handleChange}
              className="rounded" />
            Caution reçue
          </label>
        </div>

        <hr className="border-slate-100" />

        {/* Commentaire */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Commentaire</label>
          <textarea name="commentaire" value={form.commentaire} onChange={handleChange} rows={3}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        {error && (
          <p className="text-sm text-red-500 font-medium">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Link href="/dashboard/locataires"
            className="flex-1 text-center border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors">
            Annuler
          </Link>
          <button type="submit" disabled={saving}
            className="flex-1 bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
            {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  )
}
