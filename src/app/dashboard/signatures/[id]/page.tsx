'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Quittance = { id:string; locataire_id:string; mois:string; loyer_hc:number; charges:number; solde:number; total:number; date_signature:string; caution_affichee:boolean; commentaire:string|null }
type Locataire = { id:string; nom:string; email:string; bien_id:string }
type Bien = { id:string; nom:string; adresse:string; ville:string; code_postal:string|null }

function formatMois(mois:string) {
  const [year, month] = mois.split('-')
  return new Date(Number(year), Number(month)-1, 1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase())
}

export default function SignaturePage() {
  const params = useParams()
  const router = useRouter()
  const [quittance,setQuittance] = useState<Quittance|null>(null)
  const [locataire,setLocataire] = useState<Locataire|null>(null)
  const [bien,setBien] = useState<Bien|null>(null)
  const [loading,setLoading] = useState(true)
  const [sending,setSending] = useState(false)
  const [sent,setSent] = useState(false)

  useEffect(()=>{
    const supabase=createClient()
    async function load(){
      const {data:q}=await supabase.from('quittances').select('*').eq('id',params.id).single()
      if(!q){router.push('/dashboard/signatures');return}
      setQuittance(q)
      const {data:loc}=await supabase.from('locataires').select('id, nom, email, bien_id').eq('id',q.locataire_id).single()
      if(loc){
        setLocataire(loc)
        const {data:b}=await supabase.from('biens').select('id, nom, adresse, ville, code_postal').eq('id',loc.bien_id).single()
        if(b)setBien(b)
      }
      setLoading(false)
    }
    load()
  },[params.id,router])

  function downloadPDF(){
    if(!quittance)return
    window.location.href=`/api/quittance-pdf?id=${encodeURIComponent(quittance.id)}`
  }

  async function handleSendEmail(){
    setSending(true)
    const supabase=createClient()
    await supabase.from('quittances').update({envoyee:true}).eq('id',quittance!.id)
    setSent(true);setSending(false)
  }

  if(loading)return <div className="p-6 flex items-center justify-center min-h-64"><div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"/></div>
  if(!quittance||!locataire)return null

  return <div className="p-6 max-w-2xl mx-auto">
    <button onClick={()=>router.back()} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6">← Retour</button>
    <h1 className="text-2xl font-bold text-slate-900 mb-1">Générer la quittance</h1>
    <p className="text-slate-500 text-sm mb-6">{locataire.nom} — {formatMois(quittance.mois)}</p>

    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
      <h2 className="font-semibold text-slate-800 mb-4 text-sm uppercase tracking-wide">Aperçu</h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Locataire</span><span className="font-medium text-slate-900">{locataire.nom}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium text-slate-900">{locataire.email}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Bien</span><span className="font-medium text-slate-900">{bien?.nom} — {bien?.ville}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Période</span><span className="font-medium text-slate-900">{formatMois(quittance.mois)}</span></div>
        <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between"><span className="text-slate-500">Loyer HC</span><span className="font-medium">{quittance.loyer_hc.toLocaleString('fr-FR')} €</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Charges</span><span className="font-medium">{quittance.charges.toLocaleString('fr-FR')} €</span></div>
        {quittance.solde!==0&&<div className="flex justify-between"><span className="text-slate-500">Solde</span><span className="font-medium">{quittance.solde.toLocaleString('fr-FR')} €</span></div>}
        <div className="border-t border-slate-100 pt-2 flex justify-between font-bold"><span>Total</span><span>{quittance.total.toLocaleString('fr-FR')} €</span></div>
      </div>
    </div>

    <div className="flex flex-col gap-3">
      <button onClick={downloadPDF} className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-blue-700 transition-colors">↓ Télécharger le PDF</button>
      <button onClick={handleSendEmail} disabled={sending||sent} className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-3 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-60">{sent?'✓ Marquée comme envoyée':sending?'Envoi…':'Marquer comme envoyée'}</button>
    </div>
  </div>
}
