'use client'
import {propertyLabel} from '@/lib/propertyNames'

import {useRouter} from 'next/navigation'
import PeriodNavigation from '@/components/PeriodNavigation'
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
  caution_recue?:number
  date_paiement: string
  mode_paiement: string
  statut: 'recu' | 'en_retard' | 'partiel'
  solde_anterieur?:number
  commentaire: string | null
}

type Locataire = { id: string; nom: string; civilite:string|null; nom_famille:string|null; prenom:string|null; bien_id: string; qualite_interne?:string|null }
type Bien = { id: string; nom: string; nom_personnalise?: string | null; ville: string }

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
  en_retard: { label: 'À payer', class: 'bg-red-100 text-red-700' },
}

export default function PaiementsPage() {
  const router=useRouter()
  const [paiements, setPaiements] = useState<Paiement[]>([])
  const [locataires, setLocataires] = useState<Locataire[]>([])
  const [biens, setBiens] = useState<Bien[]>([])
  const [loading, setLoading] = useState(true)
  const [filtreMois, setFiltreMois] = useState(getCurrentMois())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const [{ data: p }, { data: l }, { data: b }] = await Promise.all([
      supabase.from('paiements').select('*').order('date_paiement', { ascending: false }),
      supabase.from('locataires').select('*'),
      supabase.from('biens').select('*'),
    ])
    if (p) setPaiements(p)
    if (l) setLocataires(l)
    if (b) setBiens(b)
    setLoading(false)
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
  const paiementsFiltres = filtreMois ? paiements.filter((p) => p.mois.startsWith(filtreMois)) : [...paiements]
  paiementsFiltres.sort((a,b)=>b.mois.localeCompare(a.mois)||(biensMap.get(a.bien_id)?.nom??'').localeCompare(biensMap.get(b.bien_id)?.nom??'','fr')||formatLocataireName(locatairesMap.get(a.locataire_id),'').localeCompare(formatLocataireName(locatairesMap.get(b.locataire_id),''),'fr')||b.date_paiement.localeCompare(a.date_paiement)||a.id.localeCompare(b.id))
  const totalRecu = paiementsFiltres.filter((p) => p.statut === 'recu' || p.statut === 'partiel').reduce((sum, p) => sum + p.montant + Number(p.caution_recue??0), 0)
  const enRetard = paiementsFiltres.filter((p) => p.statut === 'en_retard' || Number(p.montant)===0&&Number(p.caution_recue??0)===0).length
  const moisDisponibles = Array.from(new Set(paiements.map((p) => p.mois))).sort((a, b) => b.localeCompare(a))
  if (!moisDisponibles.includes(getCurrentMois())) moisDisponibles.unshift(getCurrentMois())

  const inputClass = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div><h1 className="text-2xl font-bold text-slate-900">Historique des paiements</h1><p className="text-slate-500 text-sm mt-1">{paiementsFiltres.length} paiement{paiementsFiltres.length !== 1 ? 's' : ''}</p></div>
        <Link href="/dashboard/paiements/nouveau" className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Enregistrer un paiement
        </Link>
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">{error}</div>}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0"><svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div><div><p className="text-xs text-slate-400">Total reçu</p><p className="text-lg font-bold text-slate-900">{totalRecu.toLocaleString('fr-FR')} €</p></div></div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3"><div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${enRetard > 0 ? 'bg-red-50' : 'bg-slate-50'}`}><svg className={`w-5 h-5 ${enRetard > 0 ? 'text-red-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><div><p className="text-xs text-slate-400">À payer</p><p className={`text-lg font-bold ${enRetard > 0 ? 'text-red-600' : 'text-slate-900'}`}>{enRetard}</p></div></div>
      </div>

      <div className="md:grid md:grid-cols-[180px_minmax(0,1fr)] gap-5"><PeriodNavigation months={moisDisponibles} value={filtreMois} onChange={setFiltreMois}/><div className="min-w-0">

      {loading ? <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div> : paiementsFiltres.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center text-center"><h2 className="text-lg font-semibold text-slate-800 mb-2">Aucun paiement enregistré</h2><p className="text-slate-500 text-sm mb-6">Enregistrez le premier paiement de loyer.</p><Link href="/dashboard/paiements/nouveau" className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium">Enregistrer un paiement</Link></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
          {paiementsFiltres.map((p,index) => {
            const locataire = locatairesMap.get(p.locataire_id)
            const bien = biensMap.get(p.bien_id) ?? (locataire ? biensMap.get(locataire.bien_id) : undefined)
            const statut = Number(p.montant)===0&&Number(p.caution_recue??0)===0?statutConfig.en_retard:statutConfig[p.statut]
            const datePaiement = new Date(p.date_paiement).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
            return <div key={p.id}>{(index===0||paiementsFiltres[index-1].mois!==p.mois)&&<h2 className="px-4 py-2 bg-slate-50 text-sm font-semibold">{formatMois(p.mois)}</h2>}<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-4">
              <div><p className="font-medium text-slate-900 text-sm">{formatLocataireName(locataire, '—')}</p><p className="text-xs text-slate-400">{bien ? `${propertyLabel(bien)} · ` : ''}{formatMois(p.mois)} · {datePaiement}</p>{Number(p.montant)===0&&<p className="text-xs text-amber-700 mt-1">Loyer du mois non payé</p>}{Number(p.solde_anterieur??0)>0&&<p className="text-xs text-amber-700">Solde antérieur : {Number(p.solde_anterieur).toLocaleString('fr-FR')} €</p>}{Number(p.caution_recue??0)>0&&<p className="text-xs text-slate-500">Caution encaissée : {Number(p.caution_recue).toLocaleString('fr-FR')} €</p>}{p.commentaire && <p className="text-xs text-slate-400 italic mt-0.5">{p.commentaire}</p>}</div>
              <div className="flex items-center gap-3 flex-shrink-0"><span className="font-bold text-slate-900 text-sm">{(p.montant+Number(p.caution_recue??0)).toLocaleString('fr-FR')} €</span><span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statut.class}`}>{statut.label}</span><div className="flex items-center gap-1 ml-1"><button type="button" onClick={() => router.push(`/dashboard/paiements/nouveau?modifier=${encodeURIComponent(p.id)}`)} title="Modifier le paiement" className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.5-8.5a2.121 2.121 0 013 3L12 16l-4 1 1-4 8.5-8.5z" /></svg></button><button type="button" onClick={() => annulerPaiement(p)} title="Annuler le paiement" className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div></div>
            </div></div>
          })}
        </div>
      )}

      </div></div>

    </div>
  )
}
