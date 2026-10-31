import {createHash} from 'node:crypto'
import {canonicalJson} from './quittanceVerification'
/** Reserve once in Postgres; an uncertain send is never repeated automatically. */
export async function sendReceiptEmail(db:any,{quittanceId,mode,payload,source}:{quittanceId:string;mode:'test'|'production';payload:any;source:unknown},request:typeof fetch=fetch){
 if(!process.env.RESEND_API_KEY)return{error:'RESEND_API_KEY manquant dans Vercel.',statusCode:503}
 const identity={mode,source,payload:{...payload,attachments:payload.attachments?.map((a:any)=>({filename:a.filename}))}},hash=createHash('sha256').update(canonicalJson(identity)).digest('hex')
 const{data:reservation,error}=await db.rpc('reserver_envoi_quittance',{p_quittance:quittanceId,p_empreinte:hash,p_mode:mode})
 if(error||!reservation?.record)return{error:'Journal d’envoi indisponible. Vérifiez la migration des envois réels ; aucun e-mail envoyé.',statusCode:503}
 const row=reservation.record
 if(!reservation.created){if(['accepted','delivered'].includes(row.statut))return{ok:true as const,id:row.id,mode,status:row.statut,reused:true};return{error:'Un envoi identique est en cours, incertain ou non remis. Vérifiez le suivi avant de recommencer.',statusCode:409,id:row.id}}
 let providerId:string|null=null,status='unknown'
 try{const response=await request('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`ekolocs-receipt/${row.id}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000),redirect:'error',cache:'no-store'});const data=await response.json();if(response.ok&&/^[a-f0-9-]{36}$/i.test(data.id??'')){providerId=data.id;status='accepted'}else if(response.status>=400&&response.status<500)status='failed'}catch{}
 const{data:saved,error:saveError}=await db.rpc('resultat_envoi_quittance',{p_id:row.id,p_statut:status,p_resend:providerId})
 if(saveError||!saved)return{error:'Résultat non enregistré. Vérifiez Resend avant tout nouvel envoi.',statusCode:503,id:row.id}
 if(status!=='accepted')return{error:status==='failed'?'Resend a refusé l’envoi. Vérifiez le domaine expéditeur, les adresses et la configuration.':'Résultat incertain : vérifiez Resend avant de renvoyer.',statusCode:502,id:row.id}
 return{ok:true as const,id:row.id,mode,status,reused:false}
}
