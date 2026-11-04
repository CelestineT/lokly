'use client'
import {useState} from 'react'
export default function CheckoutButton({plan,interval,disabled,live=false}:{plan:string;interval:'month'|'year';disabled:boolean;live?:boolean}){
 const[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function checkout(){
 if(busy||disabled)return;
 setBusy(true);setError('');
 const paymentTab=window.open('about:blank','_blank');
 if(!paymentTab){setError('Autorisez l’ouverture d’un nouvel onglet pour accéder au paiement.');setBusy(false);return}
 paymentTab.opener=null;
 try{
 const r=await fetch(live?'/api/abonnement/checkout-live':'/api/abonnement/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan,interval})});
 const d=await r.json();
 if(!r.ok)throw Error(d.error||'Paiement indisponible');
 const url=new URL(d.url);
 if(url.origin!=='https://checkout.stripe.com')throw Error('Lien de paiement invalide');
 if(paymentTab.closed)throw Error('L’onglet de paiement a été fermé. Réessayez.');
 paymentTab.location.replace(url.href);
 }catch(e){if(!paymentTab.closed)paymentTab.close();setError(e instanceof Error?e.message:'Connexion indisponible')}
 finally{setBusy(false)}
 }
 return <div><button type="button" disabled={disabled||busy} onClick={checkout} aria-label={(live?'Choisir le paiement ':'Tester le paiement ')+(interval==='month'?'mensuel':'annuel')+' (nouvel onglet)'} className="w-full rounded-xl bg-[#398fff] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#70ADFF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#080850] disabled:cursor-not-allowed disabled:bg-[#398fff] disabled:text-white">{busy?'Ouverture…':(live?'Choisir le paiement ':'Tester le paiement ')+(interval==='month'?'mensuel':'annuel')}</button>{error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</div>
}
