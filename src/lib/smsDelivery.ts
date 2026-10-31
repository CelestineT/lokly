import {twilioTestConfig} from './twilioTest'
import {createHash} from 'node:crypto'
export function smsDeliveryConfig(userId:string,env:Record<string,string|undefined>=process.env){
 const base=twilioTestConfig(userId,{...env,SMS_MODE:'twilio_test',SMS_TEST_OWNER_IDS:userId,SMS_TEST_TO:'+33600000000'})
 const allowed=(env.SMS_OWNER_IDS??'').split(',').map(x=>x.trim()).filter(Boolean)
 const missing=base.missing.filter(x=>!['SMS_TEST_TO','SMS_TEST_OWNER_IDS','SMS_MODE=twilio_test'].includes(x))
 if(env.SMS_MODE!=='production')missing.push('SMS_MODE=production')
 if(!allowed.includes(userId))missing.push('SMS_OWNER_IDS')
 return {...base,to:'',missing,ready:missing.length===0}
}
export const smsCampaignHash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
export const validCampaignId=(id:unknown):id is string=>typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)
