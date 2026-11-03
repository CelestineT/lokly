/** Transport status only: delivery never means that a person has read the email. */
export const receiptDeliveryLabels:Record<string,string>={
 reserved:'Envoi en cours de vérification',accepted:'Envoi accepté — livraison non confirmée',
 delivered:'E-mail délivré',bounced:'E-mail non délivré',complained:'Signalé comme indésirable',
 failed:'Envoi refusé',unknown:'Résultat incertain',
}
export type ReceiptDeliveryRecord={id:string;quittance_id:string;mode:string;statut:string;cree_le:string;resend_id?:string|null}
export function latestReceiptDeliveries(rows:ReceiptDeliveryRecord[]){
 const result:Record<string,ReceiptDeliveryRecord>={}
 for(const row of rows){if(row.mode!=='production')continue;const old=result[row.quittance_id];if(!old||row.cree_le>old.cree_le||(row.cree_le===old.cree_le&&row.id>old.id))result[row.quittance_id]=row}
 return result
}
export async function retrieveReceiptDelivery(row:{resend_id?:string|null;statut:string},request:typeof fetch=fetch,env:Record<string,string|undefined>=process.env){
 if(!row.resend_id)return{status:row.statut,message:'Référence absente : vérifiez la console Resend. Aucun e-mail renvoyé.'}
 const key=env.RESEND_TRACKING_API_KEY||env.RESEND_API_KEY
 if(!key)return{error:'Clé de suivi Resend à configurer dans Vercel.',statusCode:503}
 try{
  const response=await request(`https://api.resend.com/emails/${encodeURIComponent(row.resend_id)}`,{method:'GET',headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(10000),redirect:'error',cache:'no-store'})
  if(!response.ok){
   if(response.status===401||response.status===403)return{error:'Accès au suivi refusé par Resend. Configurez RESEND_TRACKING_API_KEY avec une clé Full access du même compte Resend. La clé d’envoi peut rester distincte.',statusCode:502}
   if(response.status===404)return{error:'Cet envoi est introuvable dans ce compte Resend ou son historique n’est plus disponible. Consultez Resend sans renvoyer le document.',statusCode:502}
   if(response.status===429)return{error:'Trop de consultations Resend. Patientez avant d’actualiser ; aucun e-mail renvoyé.',statusCode:429}
   return{error:'Le service de suivi Resend est temporairement indisponible. Aucun e-mail renvoyé.',statusCode:502}
  }
  const data=await response.json()
  if(data.id!==row.resend_id)return{error:'Référence de suivi incohérente.',statusCode:502}
  const event=String(data.last_event??'').replace(/^email\./,'')
  const status=['delivered','opened','clicked'].includes(event)?'delivered':['bounced','complained','failed'].includes(event)?event:row.statut
  return{status}
 }catch{return{error:'Consultation du suivi interrompue. Aucun e-mail renvoyé ; réessayez plus tard.',statusCode:503}}
}
