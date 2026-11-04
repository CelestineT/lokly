import {createHmac,timingSafeEqual} from 'node:crypto'
export function liveBillingReady(env=process.env){return /^(sk|rk)_live_/.test(env.STRIPE_LIVE_SECRET_KEY||'')&&!!env.STRIPE_LIVE_WEBHOOK_SECRET&&!!env.STRIPE_LIVE_ACCOUNT_ID&&!!env.STRIPE_LIVE_PORTAL_CONFIGURATION&&!!env.SUPABASE_SERVICE_ROLE_KEY&&['ESSENTIEL','PATRIMOINE','INVESTISSEUR'].every(p=>['MONTH','YEAR'].every(i=>!!env[`STRIPE_LIVE_PRICE_${p}_${i}`]))}
export async function stripeLiveRequest(path:string,body?:URLSearchParams,idempotencyKey?:string){
 const key=process.env.STRIPE_LIVE_SECRET_KEY;if(!key||!/^(sk|rk)_live_/.test(key))throw Error('Paiements réels non configurés')
 const r=await fetch(`https://api.stripe.com/v1/${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${key}`,'Stripe-Version':'2026-09-30.endive',...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},body,cache:'no-store',signal:AbortSignal.timeout(15000)})
 const data=await r.json();if(!r.ok)throw Error('Stripe indisponible');return data
}
export function verifyStripeLiveEvent(raw:string,signature:string,secret:string,now=Date.now()){
 const parts=signature.split(',').map(p=>p.split('=')),timestamp=parts.find(p=>p[0]==='t')?.[1]
 if(!timestamp||!/^\d+$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300)throw Error('Signature expirée')
 const expected=createHmac('sha256',secret).update(`${timestamp}.${raw}`).digest()
 if(!parts.filter(p=>p[0]==='v1'&&/^[a-f0-9]{64}$/i.test(p[1])).some(p=>timingSafeEqual(expected,Buffer.from(p[1],'hex'))))throw Error('Signature invalide')
 const event=JSON.parse(raw);if(event.livemode!==true)throw Error('Événement de test refusé');return event
}
