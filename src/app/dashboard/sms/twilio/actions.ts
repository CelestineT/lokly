'use server'
import {createClient} from '@/lib/supabase/server'
import {twilioTestConfig,validateTwilioTest,twilioRequestHash,twilioRequest,TWILIO_STATUS_LABELS} from '@/lib/twilioTest'
function publicRecord(v:any){return{id:String(v.id),status:String(v.statut),label:TWILIO_STATUS_LABELS[v.statut]??'État inconnu',segments:Number(v.segments),last4:String(v.destinataire_fin),hasSid:!!v.twilio_sid,errorCode:v.code_erreur?String(v.code_erreur):null}}
export async function envoyerTestTwilio(fd:FormData){
 const s=await createClient(),{data:{user},error}=await s.auth.getUser()
 if(error||!user)return{error:'Connectez-vous pour envoyer un test.'}
 const config=twilioTestConfig(user.id)
 if(!config.ready)return{error:'Le test réel n’est pas activé pour ce compte. Complétez la configuration Vercel.'}
 if(fd.get('confirmation')!=='oui')return{error:'Confirmez que le numéro de test vous appartient et que cet envoi peut consommer des crédits Twilio.'}
 let input;try{input=validateTwilioTest(fd.get('body'),fd.get('requestId'))}catch(e){return{error:(e as Error).message}}
 const {data:reservation,error:reserveError}=await s.rpc('reserver_test_sms',{p_id:input.requestId,p_empreinte:twilioRequestHash(user.id,config,input.body),p_segments:input.segments,p_fin:config.to.slice(-4)})
 if(reserveError||!reservation)return{error:reserveError?.message?.includes('Quota')?'Quota quotidien de tests atteint (5 essais par propriétaire, 20 segments au total).':'Impossible de réserver ce test. Vérifiez la migration SQL ; aucun appel à Twilio n’a été effectué.'}
 if(!reservation.created)return{record:publicRecord(reservation.record),reused:true}
 let result:{status:string;sid?:string;errorCode:string|null}
 try{const response=await twilioRequest(config,input.body);result={status:response.status,sid:response.ok?response.sid:undefined,errorCode:response.errorCode}}catch{result={status:'unknown',errorCode:null}}
 const {data:saved,error:saveError}=await s.rpc('enregistrer_resultat_test_sms',{p_id:input.requestId,p_statut:result.status,p_sid:result.sid??null,p_code:result.errorCode})
 if(saveError||!saved)return{error:'Le test a été réservé, mais le suivi n’a pas pu être enregistré. Ne renvoyez pas le SMS : vérifiez d’abord la console Twilio.'}
 return{record:publicRecord(saved),reused:false}
}
export async function actualiserTestTwilio(id:string){
 const s=await createClient(),{data:{user},error}=await s.auth.getUser()
 if(error||!user)return{error:'Connectez-vous pour consulter ce test.'}
 const config=twilioTestConfig(user.id)
 if(!config.ready)return{error:'Configuration Twilio indisponible.'}
 if(!/^[a-f0-9-]{36}$/i.test(id))return{error:'Test invalide.'}
 const {data:record,error:readError}=await s.from('sms_test_envois').select('*').eq('id',id).eq('proprietaire_id',user.id).maybeSingle()
 if(readError||!record)return{error:'Test introuvable.'}
 if(!record.twilio_sid)return{record:publicRecord(record)}
 try{
  const response=await twilioRequest(config,undefined,record.twilio_sid)
  if(!response.ok)return{error:'Suivi Twilio indisponible. Aucun nouvel SMS envoyé.'}
  const {data:saved,error:saveError}=await s.rpc('enregistrer_resultat_test_sms',{p_id:id,p_statut:response.status,p_sid:response.sid,p_code:response.errorCode})
  if(saveError||!saved)return{error:'Impossible d’enregistrer le suivi.'}
  return{record:publicRecord(saved)}
 }catch{return{error:'Suivi temporairement indisponible. Aucun nouvel SMS envoyé.'}}
}
