'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatLocataireName } from '@/lib/locataireName'

type Paiement = {
  id: string
  locataire_id: string
  bien_id: string
  mois: string
  montant: number
  date_paiement: string
  mode_paiement: string
  statut: 'recu' | 'en_retard' | 'partiel'
  commentaire: string | null
}

type Locataire = { id: string; nom: string; civilite:string|null; nom_famille:string|null; prenom:string|null; bien_id: string }
type Bien = { id: string; nom: string; ville: string }

function formatMois(mois: string): string {
  const [year, month] = mois.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase())
}

function getCurrentMois(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const statutConfig = {
  recu: { label: 'Reçu', class: 'bg-green-100 text-green-700' },
  partiel: { label: 'Partiel', class: 'bg-blue-100 text-blue-700' },
  en_retard: { label: 'En retard', class: 'bg-red-100 text-red-700' },
}

export default function PaiementsPage() {
  const [paiements, setPaiements] = useState<Paiement[]>([])
  const [locataires, setLocataires] = useState<Locataire[]>([])
  const [biens, setBiens] = useState<Bien[]>([])
  const [loading, setLoading] = useState(true)
  const [filtreMois, setFiltreMois] = useState(getCurrentMois())
  const [editing, setEditing] = useState<Paiement | null>(null)
  const [editForm, setEditForm] = useState({ montant: '', date_paiement: '', mode_paiement: 'virement', statut: 'recu', commentaire: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const [{ data: p }, { data: l }, { data: b }] = await Promise.all([
      supabase.from('paiements').select('*').order('date_paiement', { ascending: false }),
      supabase.from('locataires').select('id, nom, civilite, nom_famille, prenom, bien_id'),
      supabase.from('biens').select('id, nom, ville'),
    ])
    if (p) setPaiements(p)
    if (l) setLocataires(l)
    if (b) setBiens(b)
    setLoading(false)
  }

  function openEdit(p: Paiement) {
    setEditing(p)
    setError(null)
    setEditForm({ montant: String(p.montant), date_paiement: p.date_paiement, mode_paiement: p.mode_paiement, statut: p.statut, commentaire: p.commentaire ?? '' })
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from('paiements').update({
      montant: Number(editForm.montant),
      date_paiement: editForm.date_paiement,
      mode_paiement: editForm.mode_paiement,
      statut: editForm.statut,
      commentaire: editForm.commentaire || null,
    }).eq('id', editing.id)
    if (err) { setError(err.message); setSaving(false); return }
    setEditing(null)
    setSaving(false)
    await loadData()
  }

  async function annulerPaiement(p: Paiement) {
    if (!window.confirm(`Annuler le paiement de ${p.montant.toLocaleString('fr-FR')} € ?\n\nCette action supprimera ce paiement de l’historique et recalculera le total reçu.`)) return
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from('paiements').delete().eq('id', p.id)
    if (err) { setError(err.message); return }
    setPaiements((prev) => prev.filter((x) => x.id !== p.id))
  }

  const locatairesMap = new Map(locataires.map((l) => [l.id, l]))
  const biensMap = new Map(biens.map((b) => [b.id, b]))
  const paiementsFiltres = filtreMois ? paiements.filter((p) => p.mois === filtreMois) : paiements
  const totalRecu = paiementsFiltres.filter((p) => p.statut === 'recu' || p.statut === 'partiel').reduce((sum, p) => sum + p.montant, 0)
  const enRetard = paiementsFiltres.filter((p) => p.statut === 'en_retard').length
  const moisDisponibles = Array.from(new Set(paiements.map((p) => p.mois))).sort((a, b) => b.localeCompare(a))
  if (!moisDisponibles.includes(getCurrentMois())) moisDisponibles.unshift(getCurrentMois())

  const inputClass = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-slate-900">Historique des paiements</h1><p className="text-slate-500 text-sm mt-1">{paiementsFiltres.length} paiement{paiementsFiltres.length !== 1 ? 's' : ''}</p></div>
        <Link href="/dashboard/paiements/nouveau" className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Enregistrer un paiement
        </Link>
      </div>

      {error && !editing && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">{error}</div>}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0"><svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div><div><p className="text-xs text-slate-400">Total reçu</p><p className="text-lg font-bold text-slate-900">{totalRecu.toLocaleString('fr-FR')} €</p></div></div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3"><div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${enRetard > 0 ? 'bg-red-50' : 'bg-slate-50'}`}><svg className={`w-5 h-5 ${enRetard > 0 ? 'text-red-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><div><p className="text-xs text-slate-400">En retard</p><p className={`text-lg font-bold ${enRetard > 0 ? 'text-red-600' : 'text-slate-900'}`}>{enRetard}</p></div></div>
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {moisDisponibles.slice(0, 3).map((m) => <button key={m} onClick={() => setFiltreMois(m)} className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${filtreMois === m ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{formatMois(m)}</button>)}
        <label className="flex-shrink-0 relative w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-500 inline-flex items-center justify-center hover:bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500" title="Choisir un autre mois">
          <span className="sr-only">Choisir un autre mois</span>
          <svg aria-hidden="true" className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <input type="month" value={filtreMois} onChange={(e) => setFiltreMois(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </label>
        {filtreMois && <button onClick={() => setFiltreMois('')} className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors">Tout voir</button>}
      </div>

      {loading ? <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div> : paiementsFiltres.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center text-center"><h2 className="text-lg font-semibold text-slate-800 mb-2">Aucun paiement enregistré</h2><p className="text-slate-500 text-sm mb-6">Enregistrez le premier paiement de loyer.</p><Link href="/dashboard/paiements/nouveau" className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium">Enregistrer un paiement</Link></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
          {paiementsFiltres.map((p) => {
            const locataire = locatairesMap.get(p.locataire_id)
            const bien = locataire ? biensMap.get(locataire.bien_id) : biensMap.get(p.bien_id)
            const statut = statutConfig[p.statut]
            const datePaiement = new Date(p.date_paiement).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
            return <div key={p.id} className="flex items-center justify-between px-5 py-4 first:rounded-t-2xl last:rounded-b-2xl">
              <div><p className="font-medium text-slate-900 text-sm">{formatLocataireName(locataire, '—')}</p><p className="text-xs text-slate-400">{bien ? `${bien.nom} · ` : ''}{formatMois(p.mois)} · {datePaiement}</p>{p.commentaire && <p className="text-xs text-slate-400 italic mt-0.5">{p.commentaire}</p>}</div>
              <div className="flex items-center gap-3 flex-shrink-0"><span className="font-bold text-slate-900 text-sm">{p.montant.toLocaleString('fr-FR')} €</span><span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statut.class}`}>{statut.label}</span><div className="flex items-center gap-1 ml-1"><button type="button" onClick={() => openEdit(p)} title="Modifier le paiement" className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.5-8.5a2.121 2.121 0 013 3L12 16l-4 1 1-4 8.5-8.5z" /></svg></button><button type="button" onClick={() => annulerPaiement(p)} title="Annuler le paiement" className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div></div>
            </div>
          })}
        </div>
      )}

      {editing && <div className="fixed inset-0 z-50 bg-slate-900/30 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditing(null) }}><div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg p-6"><div className="flex items-start justify-between mb-5"><div><h2 className="text-xl font-bold text-slate-900">Modifier le paiement</h2><p className="text-sm text-slate-500 mt-1">Corrigez les informations enregistrées.</p></div><button type="button" onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button></div><form onSubmit={saveEdit} className="space-y-4"><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-slate-700 mb-1">Montant reçu (€)</label><input type="number" min="0" step="0.01" required value={editForm.montant} onChange={(e) => setEditForm({ ...editForm, montant: e.target.value })} className={inputClass}/></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Date de réception</label><input type="date" required value={editForm.date_paiement} onChange={(e) => setEditForm({ ...editForm, date_paiement: e.target.value })} className={inputClass}/></div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-slate-700 mb-1">Mode de paiement</label><select value={editForm.mode_paiement} onChange={(e) => setEditForm({ ...editForm, mode_paiement: e.target.value })} className={inputClass}><option value="virement">Virement</option><option value="prelevement">Prélèvement</option><option value="cheque">Chèque</option><option value="especes">Espèces</option></select></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Statut</label><select value={editForm.statut} onChange={(e) => setEditForm({ ...editForm, statut: e.target.value })} className={inputClass}><option value="recu">Reçu</option><option value="partiel">Partiel</option><option value="en_retard">En retard</option></select></div></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Commentaire</label><textarea rows={2} value={editForm.commentaire} onChange={(e) => setEditForm({ ...editForm, commentaire: e.target.value })} className={`${inputClass} resize-none`}/></div>{error && <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">{error}</div>}<div className="flex gap-3 pt-2"><button type="button" onClick={() => setEditing(null)} className="flex-1 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium">Fermer</button><button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-60">{saving ? 'Enregistrement…' : 'Enregistrer les modifications'}</button></div></form></div></div>}
    </div>
  )
}
