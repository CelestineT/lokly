'use client'
import {useState} from 'react'
export default function PortalButton({live=false}:{live?:boolean}){
 const[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function open(){setBusy(true);setError('');try{const r=await fetch(live?'/api/abonnement/portal-live':'/api/abonnement/portal',{method:'POST'}),d=await r.json();if(!r.ok)throw Error(d.error);const url=new URL(d.url);if(url.origin!=='https://billing.stripe.com')throw Error('Lien invalide');window.location.assign(url.href)}catch(e){setError(e instanceof Error?e.message:'Portail indisponible');setBusy(false)}}
 return <div className="mt-3"><button type="button" disabled={busy} onClick={open} className="rounded-xl border border-blue-300 px-4 py-2 text-blue-700 disabled:opacity-50">{busy?'Ouverture…':live?'Gérer mon abonnement':'Gérer mon abonnement de test'}</button>{error&&<p role="alert" className="mt-2 text-red-700">{error}</p>}</div>
}
