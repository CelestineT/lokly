'use client'
import {useState} from 'react'
export default function CheckoutButton({plan,interval,disabled}:{plan:string;interval:'month'|'year';disabled:boolean}){
 const[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function checkout(){setBusy(true);setError('');try{const r=await fetch('/api/abonnement/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan,interval})});const d=await r.json();if(!r.ok)throw Error(d.error||'Paiement test indisponible');const url=new URL(d.url);if(url.origin!=='https://checkout.stripe.com')throw Error('Lien de paiement invalide');window.location.assign(url.href)}catch(e){setError(e instanceof Error?e.message:'Connexion indisponible');setBusy(false)}}
 return <div><button type="button" disabled={disabled||busy} onClick={checkout} className="w-full rounded-xl bg-[#398fff] px-4 py-3 font-semibold text-[#080850] transition-colors hover:bg-[#70ADFF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#080850] disabled:cursor-not-allowed disabled:bg-[#D8E8FF] disabled:text-[#46536B]">{busy?'Ouverture…':interval==='month'?'Tester le paiement mensuel':'Tester le paiement annuel'}</button>{error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</div>
}
