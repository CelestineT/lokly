import {createHmac,timingSafeEqual} from 'node:crypto'
export function testStripeKey(){const key=process.env.STRIPE_SECRET_KEY;if(process.env.BILLING_MODE!=='test'||(!key||!/^(sk|rk)_test_/.test(key)))throw Error('Le paiement de test n’est pas encore configuré.');return key}
export async function stripeTestRequest(path:string,body?:URLSearchParams,idempotencyKey?:string){
 const r=await fetch(`https://api.stripe.com/v1/${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${testStripeKey()}`,'Stripe-Version':'2026-09-30.endive',...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},body,cache:'no-store',signal:AbortSignal.timeout(15000)})
 const data=await r.json();if(!r.ok)throw Error('Stripe test indisponible. Aucun paiement réel effectué.');return data
}
export function verifyStripeTestEvent(raw:string,signature:string,secret:string,now=Date.now()){
 const parts=signature.split(',').map(p=>p.split('=')),timestamp=parts.find(p=>p[0]==='t')?.[1];if(!timestamp||!/^\d+$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300)throw Error('Signature expirée')
 const expected=createHmac('sha256',secret).update(`${timestamp}.${raw}`).digest();const valid=parts.filter(p=>p[0]==='v1'&&/^[a-f0-9]{64}$/i.test(p[1])).some(p=>timingSafeEqual(expected,Buffer.from(p[1],'hex')));if(!valid)throw Error('Signature invalide')
 const event=JSON.parse(raw);if(event.livemode!==false)throw Error('Événement réel refusé');return event
}
