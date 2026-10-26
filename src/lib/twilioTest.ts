import {createHash} from 'node:crypto'
import {smsSegments,normalizeSmsPhone,SMS_SENDER} from './smsTemplates'
type Env=Record<string,string|undefined>
export function twilioTestConfig(userId:string,env:Env=process.env){
 const allowed=(env.SMS_TEST_OWNER_IDS??'').split(',').map(s=>s.trim()).filter(Boolean)
 const account=env.TWILIO_ACCOUNT_SID?.trim()??'',key=env.TWILIO_API_KEY_SID?.trim()??'',secret=env.TWILIO_API_KEY_SECRET?.trim()??'',from=env.TWILIO_SMS_FROM?.trim()??'',to=normalizeSmsPhone(env.SMS_TEST_TO)
 const missing:string[]=[]
 if(env.SMS_MODE!=='twilio_test')missing.push('SMS_MODE=twilio_test')
 if(!allowed.includes(userId))missing.push('SMS_TEST_OWNER_IDS')
 if(!/^AC[a-f0-9]{32}$/i.test(account))missing.push('TWILIO_ACCOUNT_SID')
 if(!/^SK[a-f0-9]{32}$/i.test(key))missing.push('TWILIO_API_KEY_SID')
 if(secret.length<16)missing.push('TWILIO_API_KEY_SECRET')
 if(from!==SMS_SENDER&&!/^\+[1-9]\d{7,14}$/.test(from))missing.push('TWILIO_SMS_FROM')
 if(!to)missing.push('SMS_TEST_TO')
 return{ready:missing.length===0,missing,account,key,secret,from,to:to??'',ownerAllowed:allowed.includes(userId),maskedTo:to?'•••• '+to.slice(-4):'Non configuré'}
}
export function validateTwilioTest(body:unknown,requestId:unknown){
 if(typeof body!=='string'||!body.trim()||body.length>1600)throw new Error('Saisissez un message de test de 1 à 1 600 caractères.')
 if(/[{}]/.test(body))throw new Error('Complétez les champs entre accolades avant l’envoi.')
 if(typeof requestId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId))throw new Error('Identifiant de test invalide. Rechargez la page.')
 const count=smsSegments(body)
 if(count.segments>3)throw new Error('Limite de test : 3 segments maximum par message. Raccourcissez le texte.')
 return{body,requestId,segments:count.segments}
}
export function twilioRequestHash(userId:string,config:ReturnType<typeof twilioTestConfig>,body:string){return createHash('sha256').update(JSON.stringify([userId,config.account,config.from,config.to,body])).digest('hex')}
const statusSet=new Set(['accepted','scheduled','queued','sending','sent','delivered','undelivered','failed','canceled'])
export function safeTwilioStatus(status:unknown){return typeof status==='string'&&statusSet.has(status)?status:'unknown'}
export async function twilioRequest(config:ReturnType<typeof twilioTestConfig>,body?:string,sid?:string,request:typeof fetch=fetch){
 if(!config.ready)throw new Error('Configuration Twilio incomplète.')
 if(sid&&!/^SM[a-f0-9]{32}$/i.test(sid))throw new Error('Référence Twilio invalide.')
 const url=`https://api.twilio.com/2010-04-01/Accounts/${config.account}/Messages${sid?'/'+sid:''}.json`
 const response=await request(url,{method:sid?'GET':'POST',headers:{Authorization:'Basic '+Buffer.from(config.key+':'+config.secret).toString('base64'),...(sid?{}:{'Content-Type':'application/x-www-form-urlencoded'})},...(sid?{}:{body:new URLSearchParams({To:config.to,From:config.from,Body:body!})}),signal:AbortSignal.timeout(15000),cache:'no-store',redirect:'error'})
 const data=await response.json()
 if(!response.ok)return{ok:false as const,status:response.status>=500?'unknown':'failed',errorCode:Number.isInteger(data.code)?String(data.code):null}
 if(!/^SM[a-f0-9]{32}$/i.test(data.sid??'')||data.account_sid!==config.account||data.to!==config.to)return{ok:false as const,status:'unknown',errorCode:null}
 return{ok:true as const,sid:String(data.sid),status:safeTwilioStatus(data.status),errorCode:Number.isInteger(data.error_code)?String(data.error_code):null}
}
export const TWILIO_STATUS_LABELS:Record<string,string>={reserved:'Test réservé — résultat à vérifier',unknown:'Résultat incertain — vérifier dans Twilio',accepted:'Accepté par Twilio',scheduled:'Planifié chez Twilio',queued:'En file d’attente chez Twilio',sending:'Transmission en cours',sent:'Transmis à l’opérateur — réception non confirmée',delivered:'Réception confirmée par Twilio',undelivered:'Non remis au téléphone',failed:'Échec',canceled:'Annulé'}
