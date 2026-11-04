type Session={id:string;status:string;livemode:boolean;client_reference_id:string|null;url?:string|null}
type Choice={session_id:string;plan:string;interval:string}
type Dependencies={read:()=>Promise<Session>;expire:()=>Promise<Session>;claim:()=>Promise<boolean>}
/** Never create a replacement until Stripe confirms the old session cannot be paid. */
export async function prepareCheckoutChoice(previous:Choice,desired:{plan:string;interval:string},userId:string,deps:Dependencies):Promise<{state:'reuse';url:string}|{state:'replace'|'busy'|'complete'}>{
 const validate=(session:Session)=>{
  if(session.id!==previous.session_id||session.livemode!==true||session.client_reference_id!==userId)throw Error('Session invalide')
  return session
 }
 let session=validate(await deps.read())
 if(session.status==='complete')return {state:'complete'}
 if(session.status==='open'&&previous.plan===desired.plan&&previous.interval===desired.interval&&session.url)return {state:'reuse',url:session.url}
 if(!await deps.claim())return {state:'busy'}
 if(session.status==='open'){
  try{session=validate(await deps.expire())}
  catch(error){
   // Payment may have completed in the old tab just before the expiration request.
   session=validate(await deps.read())
   if(session.status==='complete')return {state:'complete'}
   if(session.status!=='expired')throw error
  }
 }
 if(session.status==='complete')return {state:'complete'}
 if(session.status!=='expired')throw Error('Session invalide')
 return {state:'replace'}
}
