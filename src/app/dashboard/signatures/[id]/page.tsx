'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Quittance = {
  id: string
  locataire_id: string
  mois: string
  loyer_hc: number
  charges: number
  lots_annexes_total?: number
  lots_annexes_detail?: Array<{lot_id:string;numero_lot:string;type:string;prix_mensuel:number}>
  solde: number
  total: number
  date_signature: string
  envoyee: boolean
}

type Locataire = { id: string; nom: string; email: string; bien_id: string }
type Bien = { id: string; nom: string; adresse: string; ville: string; code_postal: string | null }
const labels:Record<string,string>={box:'Box',parking:'Parking',garage:'Garage',cave:'Cave'}

function formatMois(mois: string): string {
  const [year, month] = mois.split('-')
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase())
}

export default function SignaturePage() {
  const params = useParams()
  const router = useRouter()
  const [quittance, setQuittance] = useState<Quittance | null>(null)
  const [locataire, setLocataire] = useState<Locataire | null>(null)
  const [bien, setBien] = useState<Bien | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: q } = await supabase.from('quittances').select('*').eq('id', params.id).single()
      if (!q) { router.push('/dashboard/signatures'); return }
      setQuittance(q as Quittance)
      const { data: loc } = await supabase.from('locataires').select('id, nom, email, bien_id').eq('id', q.locataire_id).single()
      if (loc) {
        setLocataire(loc)
        const { data: b } = await supabase.from('biens').select('id, nom, adresse, ville, code_postal').eq('id', q.bien_id || loc.bien_id).single()
        if (b) setBien(b)
      }
      setLoading(false)
    }
    load()
  }, [params.id, router])

  function downloadPDF() {
    if (!quittance) return
    window.location.href = `/api/quittance-pdf?id=${encodeURIComponent(quittance.id)}`
  }

  if (loading) return <div className="p-6 flex items-center justify-center min-h-64"><div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" /></div>
  if (!quittance || !locataire) return null

  const details=Array.isArray(quittance.lots_annexes_detail)?quittance.lots_annexes_detail:[]
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6">← Retour</button>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Quittance de loyer</h1>
      <p className="text-slate-500 text-sm mb-6">{locataire.nom} — {formatMois(quittance.mois)}</p>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4 text-sm uppercase tracking-wide">Aperçu</h2>
        <div className="space-y-2 text-sm">
          <Row label="Locataire" value={locataire.nom}/>
          <Row label="Email" value={locataire.email}/>
          <Row label="Bien" value={`${bien?.nom ?? '—'}${bien?.ville ? ` — ${bien.ville}` : ''}`}/>
          <Row label="Période" value={formatMois(quittance.mois)}/>
          <div className="border-t border-slate-100 pt-2 mt-2"><Row label="Loyer HC" value={`${Number(quittance.loyer_hc).toLocaleString('fr-FR')} €`}/></div>
          <Row label="Charges" value={`${Number(quittance.charges).toLocaleString('fr-FR')} €`}/>
          {details.map((lot,i)=><Row key={`${lot.lot_id}-${i}`} label={`${labels[lot.type]??lot.type}${lot.numero_lot?` · ${lot.numero_lot}`:''}`} value={`${Number(lot.prix_mensuel??0).toLocaleString('fr-FR')} €`}/>)}
          {details.length===0&&Number(quittance.lots_annexes_total??0)>0&&<Row label="Lots annexes" value={`${Number(quittance.lots_annexes_total).toLocaleString('fr-FR')} €`}/>} 
          {Number(quittance.solde)!==0&&<Row label="Solde" value={`${Number(quittance.solde).toLocaleString('fr-FR')} €`}/>} 
          <div className="border-t border-slate-100 pt-2 flex justify-between font-bold"><span>Total</span><span>{Number(quittance.total).toLocaleString('fr-FR')} €</span></div>
        </div>
      </div>

      <button onClick={downloadPDF} className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-blue-700">↓ Télécharger la quittance PDF</button>
      <p className="text-xs text-slate-400 text-center mt-3">Le téléchargement utilise le même modèle de quittance que l’envoi par e-mail.</p>
    </div>
  )
}

function Row({label,value}:{label:string;value:string}){return <div className="flex justify-between gap-4"><span className="text-slate-500">{label}</span><span className="font-medium text-slate-900 text-right">{value}</span></div>}
