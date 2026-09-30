'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Quittance = { id:string; locataire_id:string; mois:string; total:number; envoyee:boolean }
type Locataire = { id:string; nom:string }
type Bien = { id:string; type:string }
const LOGEMENTS = new Set(['appartement','maison','studio'])

function formatMois(mois:string) { const [y,m]=mois.split('-'); return new Date(Number(y),Number(m)-1,1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase()) }
function getCurrentMois() { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}` }

export default function DashboardPage() {
  const [logements,setLogements]=useState(0)
  const [horsLogements,setHorsLogements]=useState(0)
  const [locataires,setLocataires]=useState(0)
  const [quittances,setQuittances]=useState<Quittance[]>([])
  const [locatairesMap,setLocatairesMap]=useState<Map<string,string>>(new Map())
  const [loading,setLoading]=useState(true)
  const moisCourant=getCurrentMois()

  useEffect(()=>{ const supabase=createClient(); Promise.all([
    supabase.from('biens').select('id,type'),
    supabase.from('locataires').select('id',{count:'exact',head:true}).eq('actif',true),
    supabase.from('quittances').select('id,locataire_id,mois,total,envoyee').order('mois',{ascending:false}).limit(20),
    supabase.from('locataires').select('id,nom'),
  ]).then(([biensRes,locRes,qRes,lData])=>{
    const biens=(biensRes.data ?? []) as Bien[]
    setLogements(biens.filter(b=>LOGEMENTS.has(b.type)).length)
    setHorsLogements(biens.filter(b=>!LOGEMENTS.has(b.type)).length)
    setLocataires(locRes.count ?? 0); if(qRes.data)setQuittances(qRes.data); if(lData.data)setLocatairesMap(new Map((lData.data as Locataire[]).map(l=>[l.id,l.nom]))); setLoading(false)
  }) },[])

  const qm=quittances.filter(q=>q.mois===moisCourant); const total=qm.reduce((s,q)=>s+q.total,0); const aEnvoyer=qm.filter(q=>!q.envoyee).length; const recentes=quittances.slice(0,5)
  const kpis=[
    {label:'Logements',value:logements,href:'/dashboard/biens'},
    {label:'Biens hors logements',value:horsLogements,href:'/dashboard/biens'},
    {label:'Locataires actifs',value:locataires,href:'/dashboard/locataires'},
    {label:`Loyers ${formatMois(moisCourant)}`,value:`${total.toLocaleString('fr-FR')} €`,href:'/dashboard/paiements'},
    {label:'Quittances à envoyer',value:aEnvoyer,href:'/dashboard/quittances'},
  ]

  return <div className="p-6 max-w-5xl mx-auto"><div className="mb-8"><h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1><p className="text-slate-500 text-sm mt-1">{formatMois(moisCourant)}</p></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">{kpis.map(k=><Link key={k.label} href={k.href} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow"><p className="text-xs text-slate-400 font-medium">{k.label}</p><p className="text-2xl font-bold text-slate-900 mt-1">{loading?'…':k.value}</p></Link>)}</div>
    <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Dernières quittances</h2><Link href="/dashboard/quittances" className="text-xs text-blue-600">Voir tout →</Link></div>
    {loading?<div className="h-20 bg-slate-100 rounded-2xl animate-pulse"/>:recentes.length===0?<div className="bg-white rounded-2xl border p-8 text-center text-slate-400 text-sm">Aucune quittance pour le moment</div>:<div className="bg-white rounded-2xl border divide-y">{recentes.map(q=><Link key={q.id} href={`/dashboard/quittances/${q.id}`} className="flex justify-between px-5 py-4"><div><p className="font-medium text-sm">{locatairesMap.get(q.locataire_id)??'—'}</p><p className="text-xs text-slate-400">{formatMois(q.mois)}</p></div><span className="font-semibold text-sm">{q.total.toLocaleString('fr-FR')} €</span></Link>)}</div>}
  </div>
}
