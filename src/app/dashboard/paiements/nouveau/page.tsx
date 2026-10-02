'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Locataire = { id: string; nom: string; bien_id: string; bail_id: string | null; loyer_hc: number; charges: number; est_principal: boolean | null }
type Bail = { id: string; loyer_hc: number; charges: number; type_occupation: string | null }
type Bien = { id: string; nom: string; ville: string }
type LotDetail = { lot_id: string; numero_lot: string; type: string; prix_mensuel: number }
type Choice = { key: string; locataireId: string; bailId: string | null; nom: string; bienId: string; bienNom: string; loyerHc: number; charges: number; occupants: number }

const lotLabels: Record<string, string> = { box: 'Box', parking: 'Parking', garage: 'Garage', cave: 'Cave' }

function getCurrentMois(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthBounds(mois: string) {
  const [year, month] = mois.split('-').map(Number)
  if (!year || !month) return null
  return { start: `${mois}-01`, end: new Date(year, month, 0).toISOString().slice(0, 10) }
}

export default function NouveauPaiementPage() {
  const router = useRouter()
  const [locataires, setLocataires] = useState<Locataire[]>([])
  const [baux, setBaux] = useState<Bail[]>([])
  const [biens, setBiens] = useState<Bien[]>([])
  const [selected, setSelected] = useState('')
  const [lots, setLots] = useState<LotDetail[]>([])
  const [lotsLoading, setLotsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
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
      supabase.from('locataires').select('id, nom, bien_id, bail_id, loyer_hc, charges, est_principal').eq('actif', true).order('nom'),
      supabase.from('baux').select('id, loyer_hc, charges, type_occupation').eq('actif', true),
      supabase.from('biens').select('id, nom, ville').order('nom'),
    ]).then(([locs, leases, properties]) => {
      setLocataires((locs.data ?? []) as Locataire[])
      setBaux((leases.data ?? []) as Bail[])
      setBiens((properties.data ?? []) as Bien[])
    })
  }, [])

  const choices = useMemo<Choice[]>(() => {
    const bauxMap = new Map(baux.map((b) => [b.id, b]))
    const biensMap = new Map(biens.map((b) => [b.id, b]))
    const groups = new Map<string, Locataire[]>()

    for (const locataire of locataires) {
      const key = locataire.bail_id ? `b:${locataire.bail_id}` : `l:${locataire.id}`
      groups.set(key, [...(groups.get(key) ?? []), locataire])
    }

    return [...groups.entries()].map(([key, occupants]) => {
      const principal = occupants.find((o) => o.est_principal) ?? occupants[0]
      const bail = principal.bail_id ? bauxMap.get(principal.bail_id) : undefined
      const bien = biensMap.get(principal.bien_id)
      return {
        key,
        locataireId: principal.id,
        bailId: principal.bail_id,
        nom: principal.nom,
        bienId: principal.bien_id,
        bienNom: bien?.nom ?? '',
        loyerHc: Number(bail?.loyer_hc ?? principal.loyer_hc ?? 0),
        charges: Number(bail?.charges ?? principal.charges ?? 0),
        occupants: occupants.length,
      }
    })
  }, [locataires, baux, biens])

  const choice = choices.find((c) => c.key === selected)

  useEffect(() => {
    let cancelled = false

    async function loadLots() {
      if (!choice?.bailId) {
        setLots([])
        return
      }
      const bounds = monthBounds(form.mois)
      if (!bounds) {
        setLots([])
        return
      }

      setLotsLoading(true)
      setError(null)
      const supabase = createClient()
      const { data, error: lotsError } = await supabase
        .from('affectations_lots_baux')
        .select('lot_id, date_debut, date_fin, prix_mensuel, lots(numero_lot,type)')
        .eq('bail_id', choice.bailId)
        .lte('date_debut', bounds.end)
        .or(`date_fin.is.null,date_fin.gte.${bounds.start}`)

      if (cancelled) return
      if (lotsError) {
        setError(`Impossible de charger les lots annexes : ${lotsError.message}`)
        setLots([])
      } else {
        setLots((data ?? []).map((affectation: any) => {
          const lot = Array.isArray(affectation.lots) ? affectation.lots[0] : affectation.lots
          return {
            lot_id: affectation.lot_id,
            numero_lot: lot?.numero_lot ?? '',
            type: lot?.type ?? 'lot',
            prix_mensuel: Number(affectation.prix_mensuel ?? 0),
          }
        }))
      }
      setLotsLoading(false)
    }

    loadLots()
    return () => { cancelled = true }
  }, [choice?.bailId, form.mois])

  const lotsTotal = lots.reduce((sum, lot) => sum + lot.prix_mensuel, 0)
  const loyerCharges = choice ? choice.loyerHc + choice.charges : 0
  const totalAttendu = loyerCharges + lotsTotal

  useEffect(() => {
    if (!choice || lotsLoading) return
    setForm((prev) => ({ ...prev, montant: String(totalAttendu), statut: 'recu' }))
  }, [choice?.key, totalAttendu, lotsLoading])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((prev) => {
      if (name === 'montant') {
        const montant = Number(value)
        return { ...prev, montant: value, statut: montant >= totalAttendu ? 'recu' : 'partiel' }
      }
      return { ...prev, [name]: value }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!choice) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Non autorisé'); setSaving(false); return }

    const { error: err } = await supabase.from('paiements').insert({
      proprietaire_id: user.id,
      locataire_id: choice.locataireId,
      bien_id: choice.bienId,
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
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Enregistrer un paiement</h1>
          <p className="text-sm text-slate-500 mt-1">Le montant attendu est calculé à partir du bail et de ses lots annexes facturables.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Locataire / bail *</label>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Sélectionner un bail</option>
            {choices.map((c) => (
              <option key={c.key} value={c.key}>{c.nom}{c.bienNom ? ` — ${c.bienNom}` : ''}{c.occupants > 1 ? ` · Bail commun · ${c.occupants} occupants` : ''}</option>
            ))}
          </select>
          {choice && choice.occupants > 1 && <p className="text-xs text-slate-500 mt-1">Ce bail commun est comptabilisé une seule fois. {choice.nom} est le locataire principal.</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Mois concerné *</label>
          <input name="mois" type="month" value={form.mois} onChange={handleChange} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {choice && (
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Loyer hors charges</span><span className="font-medium text-slate-800">{choice.loyerHc.toLocaleString('fr-FR')} €</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Charges</span><span className="font-medium text-slate-800">{choice.charges.toLocaleString('fr-FR')} €</span></div>
            {lotsLoading ? <p className="text-sm text-slate-500">Chargement des lots annexes…</p> : lots.map((lot) => (
              <div key={lot.lot_id} className="flex justify-between text-sm"><span className="text-slate-500">{lotLabels[lot.type] ?? lot.type}{lot.numero_lot ? ` · ${lot.numero_lot}` : ''}</span><span className="font-medium text-slate-800">{lot.prix_mensuel.toLocaleString('fr-FR')} €</span></div>
            ))}
            <div className="flex justify-between font-semibold text-slate-900 pt-2 border-t border-slate-200"><span>Total attendu</span><span>{totalAttendu.toLocaleString('fr-FR')} €</span></div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Montant reçu (€) *</label>
            <input name="montant" type="number" step="0.01" min="0" value={form.montant} onChange={handleChange} required placeholder="0" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {choice && Number(form.montant) < totalAttendu && <p className="text-xs text-amber-600 mt-1">Paiement partiel : il reste {(totalAttendu - Number(form.montant || 0)).toLocaleString('fr-FR')} € à recevoir.</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date de réception *</label>
            <input name="date_paiement" type="date" value={form.date_paiement} onChange={handleChange} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mode de paiement</label>
            <select name="mode_paiement" value={form.mode_paiement} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="virement">Virement</option><option value="prelevement">Prélèvement</option><option value="cheque">Chèque</option><option value="especes">Espèces</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
            <select name="statut" value={form.statut} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="recu">Reçu</option><option value="partiel">Partiel</option><option value="en_retard">En retard</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Commentaire</label>
          <textarea name="commentaire" value={form.commentaire} onChange={handleChange} rows={2} placeholder="Ex : paiement en deux fois, chèque en attente..." className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Link href="/dashboard/paiements" className="flex-1 text-center border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors">Annuler</Link>
          <button type="submit" disabled={saving || !choice || lotsLoading} className="flex-1 bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </div>
  )
}
