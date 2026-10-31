'use server'
import {createClient} from '@/lib/supabase/server'
import {readAllRows} from '@/lib/readAllRows'
import {prepareSms,SMS_TEMPLATES,smsFields} from '@/lib/smsTemplates'
import {formatLocataireName} from '@/lib/locataireName'
import {smsDeliveryConfig,smsCampaignHash,validCampaignId} from '@/lib/smsDelivery'
import {twilioRequest,TWILIO_STATUS_LABELS} from '@/lib/twilioTest'
export type SmsCampaignInput={id:string;selected:string[];templateId:string;body:string;values:Record<string,string>;overrides:Record<string,Record<string,string>>;confirmed:boolean;revisionChecked:boolean}
function publicSms(row:any){return{id:row.id,status:row.statut,label:row.statut==='reserved'?'Envoi réservé — pas encore transmis':TWILIO_STATUS_LABELS[row.statut]??row.statut,last4:String(row.telephone??'').slice(-4),segments:Number(row.segments),hasSid:!!row.twilio_sid,errorCode:row.code_erreur??null}}
export async function envoyerCampagneSms(input:SmsCampaignInput){
 if(!input||!validCampaignId(input.id)||!input.confirmed||typeof input.templateId!=='string'||input.templateId.length>100||!Array.isArray(input.selected)||!input.selected.length||input.selected.length>50||new Set(input.selected).size!==input.selected.length||input.selected.some(x=>typeof x!=='string'||x.length>100)||typeof input.body!=='string'||input.body.length>1600||JSON.stringify(input).length>60000)return{error:'Vérifiez le message, la confirmation et la sélection (50 locataires maximum).'}
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return{error:'Connexion nécessaire.'}
 const config=smsDeliveryConfig(user.id);if(!config.ready)return{error:'Envoi réel désactivé : configuration Vercel à compléter.'}
 const [{data:locs},{data:biens}]=await Promise.all([readAllRows(s.from('locataires').select('id,nom,nom_famille,prenom,civilite,telephone,bien_id,actif').eq('proprietaire_id',user.id).in('id',input.selected)),readAllRows(s.from('biens').select('id,nom,ville').eq('proprietaire_id',user.id))])
 if(locs.length!==input.selected.length)return{error:'Un destinataire est introuvable ou ne vous appartient pas.'}
 let template:any=SMS_TEMPLATES.find(t=>t.id===input.templateId)
 if(!template){const{data:t}=await s.from('sms_modeles').select('usage,origine').eq('id',input.templateId).eq('proprietaire_id',user.id).maybeSingle();if(!t)return{error:'Modèle introuvable.'};template={kind:t.usage,origin:t.origine}}
 if(template.kind==='individual'&&locs.length!==1)return{error:'Ce modèle nécessite un seul destinataire.'}
 if((input.templateId==='revision'||template.origin==='revision'||smsFields(input.body).some(f=>['nouveau_loyer_hc','date_effet'].includes(f)))&&!input.revisionChecked)return{error:'Confirmez la vérification des révisions et des courriers.'}
 const safeFields=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.entries(v).every(([k,x])=>k.length<100&&typeof x==='string'&&x.length<=2000)
 if(!safeFields(input.values))return{error:'Champs invalides.'}
 if(!input.overrides||typeof input.overrides!=='object'||Object.values(input.overrides).some(v=>!safeFields(v)))return{error:'Champs individuels invalides.'}
 const properties=new Map(biens.map(b=>[b.id,[b.nom,b.ville].filter(Boolean).join(' · ')])),byId=new Map(locs.map(l=>[l.id,l]))
 const recipients=input.selected.map(id=>byId.get(id)!).map(l=>({id:String(l.id),name:formatLocataireName(l),firstName:l.prenom??'',phone:l.telephone,propertyId:l.bien_id,propertyName:properties.get(l.bien_id)??'Non rattaché',active:l.actif!==false}))
 const result=prepareSms(recipients,input.body,input.values,input.overrides);if(!result.ready)return{error:'Corrigez les numéros, champs ou messages avant l’envoi.'}
 const messages=result.previews.filter(p=>!p.duplicateOf).map(p=>({locataire_id:p.recipient.id,telephone:p.phone,texte:p.text,segments:p.segments}))
 const hash=smsCampaignHash([user.id,config.account,config.from,messages]),{data:reservation,error}=await s.rpc('reserver_campagne_sms',{p_id:input.id,p_empreinte:hash,p_messages:messages})
 if(error||!reservation)return{error:'Réservation impossible : vérifiez le solde de segments, les plafonds et la migration 20261031181756_envois_reels.sql. Aucun nouveau SMS envoyé.'}
 const rows:any[]=reservation.rows??[],pending=rows.filter(r=>r.statut==='reserved').slice(0,5)
 let trackingError=false
 const processed=await Promise.all(pending.map(async row=>{
  const{data:claimed,error:claimError}=await s.rpc('prendre_sms_campagne',{p_id:row.id});if(claimError){trackingError=true;return row}if(!claimed)return {...row,statut:'sending'}
  let response:any;try{response=await twilioRequest({...config,to:row.telephone},row.texte)}catch{response={status:'unknown',errorCode:null}}
  const{data:saved,error:saveError}=await s.rpc('resultat_sms_campagne',{p_id:row.id,p_statut:response.status,p_sid:response.sid??null,p_code:response.errorCode??null});if(saveError||!saved){trackingError=true;return{...row,statut:'unknown'}}return saved
 }))
 const updated=new Map(processed.map(r=>[r.id,r])),all=rows.map(r=>updated.get(r.id)??r)
 return{records:all.map(publicSms),remaining:all.filter(r=>r.statut==='reserved').length,trackingError}
}
export async function actualiserCampagneSms(id:string){
 if(!validCampaignId(id))return{error:'Envoi invalide.'}
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return{error:'Connexion nécessaire.'}
 const config=smsDeliveryConfig(user.id);if(!config.ready)return{error:'Configuration Twilio indisponible.'}
 const{data:row,error}=await s.from('sms_envois').select('*').eq('id',id).eq('proprietaire_id',user.id).maybeSingle();if(error||!row)return{error:'Envoi introuvable.'}
 if(!row.twilio_sid)return{record:publicSms(row)}
 try{const result=await twilioRequest({...config,to:row.telephone},undefined,row.twilio_sid);if(!result.ok)return{error:'Suivi indisponible. Aucun SMS renvoyé.'};const{data:saved,error:e}=await s.rpc('resultat_sms_campagne',{p_id:id,p_statut:result.status,p_sid:result.sid,p_code:result.errorCode});if(e||!saved)return{error:'Suivi non enregistré.'};return{record:publicSms(saved)}}catch{return{error:'Suivi indisponible. Aucun SMS renvoyé.'}}
}
