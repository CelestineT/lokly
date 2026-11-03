const assert=require('assert');const {loadSource}=require('./source-loader.cjs');
const {retrieveReceiptDelivery,latestReceiptDeliveries,receiptDeliveryLabels}=loadSource('src/lib/receiptDeliveryStatus.ts',{}, {AbortSignal});
const id='11111111-1111-4111-8111-111111111111',row={resend_id:id,statut:'accepted'};
(async()=>{
 let calls=0,code=200,event='delivered',wrong=false;
 const request=async(url,options)=>{calls++;assert.equal(options.method,'GET');assert.equal(options.headers.Authorization,'Bearer tracking-test');assert(!options.body);return{ok:code===200,status:code,json:async()=>({id:wrong?'other':id,last_event:event})}};
 const env={RESEND_API_KEY:'sending-test',RESEND_TRACKING_API_KEY:'tracking-test'};
 assert.equal((await retrieveReceiptDelivery(row,request,env)).status,'delivered');
 for(event of ['email.delivered','opened','clicked'])assert.equal((await retrieveReceiptDelivery(row,request,env)).status,'delivered');
 for(event of ['sent','queued','delivery_delayed','new_event'])assert.equal((await retrieveReceiptDelivery(row,request,env)).status,'accepted');
 for(event of ['bounced','complained','failed'])assert.equal((await retrieveReceiptDelivery(row,request,env)).status,event);
 code=403;let r=await retrieveReceiptDelivery(row,request,env);assert(r.error.includes('Full access'));assert(!JSON.stringify(r).includes('tracking-test'));
 code=404;assert((await retrieveReceiptDelivery(row,request,env)).error.includes('introuvable'));
 code=429;assert.equal((await retrieveReceiptDelivery(row,request,env)).statusCode,429);
 code=200;wrong=true;assert((await retrieveReceiptDelivery(row,request,env)).error.includes('incohérente'));
 const before=calls;assert((await retrieveReceiptDelivery({statut:'unknown'},request,env)).message);assert.equal(calls,before);assert.equal((await retrieveReceiptDelivery(row,request,{})).statusCode,503);assert.equal(calls,before);
 assert((await retrieveReceiptDelivery(row,async()=>{throw Error('network')},env)).error.includes('Aucun e-mail renvoyé'));
 const latest=latestReceiptDeliveries([{id:'a',quittance_id:'q',mode:'production',cree_le:'2026-01-01',statut:'delivered'},{id:'b',quittance_id:'q',mode:'production',cree_le:'2026-02-01',statut:'accepted'},{id:'c',quittance_id:'q',mode:'test',cree_le:'2026-03-01',statut:'delivered'}]);assert.equal(latest.q.id,'b');assert.equal(receiptDeliveryLabels.accepted,'Envoi accepté — livraison non confirmée');
 // The route checks authentication and ownership before provider lookup.
 let user=null,owned=false,reads=0;const db={auth:{getUser:async()=>({data:{user}})},from(){const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:owned?{id,statut:'accepted',resend_id:id}:null})};return q}};
 const route=loadSource('src/app/api/quittance-delivery/route.ts',{'next/server':{NextResponse:{json:(body,opts={})=>({body,status:opts.status||200})}},'@/lib/supabase/server':{createClient:async()=>db},'@/lib/receiptDeliveryStatus':{retrieveReceiptDelivery:async()=>{reads++;return{status:'delivered'}}}},{AbortSignal});
 const req={json:async()=>({id})};assert.equal((await route.POST(req)).status,401);user={id:'owner'};assert.equal((await route.POST(req)).status,404);assert.equal(reads,0);
 console.log('Suivi quittances : lecture seule fournisseur, droits de suivi distincts, erreurs explicites, événements, dernier envoi réel, refus anonyme/autre propriétaire, aucun renvoi : OK');
})().catch(e=>{console.error(e);process.exit(1)});
