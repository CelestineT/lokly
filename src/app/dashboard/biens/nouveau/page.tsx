'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ajouterBien } from './actions'
import { createClient } from '@/lib/supabase/client'

const NON_HABITABLE = ['parking','box','garage','cave','autre']
const SPECIFICITES = ['Duplex','Triplex','Mansardé','Souplex','Loft','Rez-de-jardin','Dernier étage','Autre']
type BienOption={id:string;nom:string;type:string}

export default function NouveauBienPage(){
 const [loading,setLoading]=useState(false),[error,setError]=useState<string|null>(null),[type,setType]=useState(''),[rattachement,setRattachement]=useState(''),[biens,setBiens]=useState<BienOption[]>([])
 const nonHabitable=NON_HABITABLE.includes(type), rattachable=['parking','box','garage','cave'].includes(type), logement=['appartement','maison','studio'].includes(type)
 useEffect(()=>{createClient().from('biens').select('id,nom,type').then(({data})=>setBiens((data??[]) as BienOption[]))},[])
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setLoading(true);setError(null);const r=await ajouterBien(new FormData(e.currentTarget));if(r?.error){setError(r.error);setLoading(false)}}
 const cls='w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
 return <div className="p-6 max-w-2xl mx-auto"><Link href="/dashboard/biens" className="text-sm text-slate-500">← Retour à mes biens</Link><h1 className="text-2xl font-bold mt-5">Ajouter un bien</h1><p className="text-sm text-slate-500 mt-1 mb-6">Renseignez les informations du bien immobilier.</p>
 <form onSubmit={submit} className="bg-white rounded-2xl border p-6 space-y-5">
  <div><label className="text-sm font-medium">Nom du bien *</label><input name="nom" required className={cls} placeholder="Ex : Appartement République"/></div>
  <div><label className="text-sm font-medium">Adresse *</label><input name="adresse" required className={cls}/></div>
  <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium">Ville *</label><input name="ville" required className={cls}/></div><div><label className="text-sm font-medium">Code postal *</label><input name="code_postal" required className={cls}/></div></div>
  <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium">Type de bien *</label><select name="type" required value={type} onChange={e=>{setType(e.target.value);setRattachement('')}} className={cls}><option value="">Choisir…</option><option value="appartement">Appartement</option><option value="maison">Maison</option><option value="studio">Studio</option><option value="immeuble">Immeuble</option><option value="immeuble_rapport">Immeuble de rapport</option><option value="parking">Parking</option><option value="box">Box</option><option value="garage">Garage</option><option value="cave">Cave</option><option value="local_commercial">Local commercial</option><option value="autre">Autre</option></select></div>
  {!nonHabitable&&<div><label className="text-sm font-medium">Type de location *</label><select name="type_location" required className={cls}><option value="">Choisir…</option><option value="meuble">Meublé</option><option value="non_meuble">Non meublé</option>{type==='immeuble_rapport'&&<option value="mixte">Mixte</option>}</select></div>}</div>
  {logement&&<div><label className="text-sm font-medium">Spécificité du logement</label><select name="specificite" className={cls}><option value="">Aucune / standard</option>{SPECIFICITES.map(x=><option key={x}>{x}</option>)}</select></div>}
  <div className="grid grid-cols-3 gap-4"><div><label className="text-sm font-medium">Surface (m²)</label><input name="surface_m2" type="number" min="0" step="0.01" className={cls}/></div>{!nonHabitable&&type!=='immeuble_rapport'&&<div><label className="text-sm font-medium">Nb pièces</label><input name="nb_pieces" type="number" min="1" className={cls}/></div>}<div><label className="text-sm font-medium">Prix d’achat (€)</label><input name="prix_achat" type="number" min="0" className={cls}/></div></div>
  {type==='immeuble_rapport'&&<div><label className="text-sm font-medium">Nombre de lots</label><input name="nb_lots" type="number" min="1" className={cls}/></div>}
  {rattachable&&<div className="rounded-xl bg-slate-50 border p-4 space-y-3"><p className="font-medium text-sm">Rattachement du {type}</p><select name="rattachement_type" value={rattachement} onChange={e=>setRattachement(e.target.value)} className={cls}><option value="">Indépendant</option><option value="bien">Rattaché à un logement existant</option><option value="locataire_externe">Loué à un locataire externe</option></select>{rattachement==='bien'&&<select name="parent_bien_id" className={cls} required><option value="">Choisir le logement…</option>{biens.filter(b=>['appartement','maison','studio'].includes(b.type)).map(b=><option key={b.id} value={b.id}>{b.nom}</option>)}</select>}{rattachement==='locataire_externe'&&<div className="grid grid-cols-2 gap-3"><input name="locataire_externe_nom" required placeholder="Nom du locataire" className={cls}/><input name="locataire_externe_email" type="email" placeholder="E-mail (facultatif)" className={cls}/></div>}</div>}
  {error&&<p className="text-sm text-red-600">{error}</p>}<div className="flex gap-3"><button disabled={loading} className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">{loading?'Enregistrement…':'Ajouter le bien'}</button><Link href="/dashboard/biens" className="px-4 py-2 text-sm text-slate-500">Annuler</Link></div>
 </form></div>
}
