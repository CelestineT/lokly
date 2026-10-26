import {createHash} from 'node:crypto'
import QRCode from 'qrcode'
import type {QuittancePdfData} from './generateQuittancePdf'

export class VerificationSetupError extends Error {}
export const VERIFICATION_TOKEN=/^[a-f0-9]{64}$/
export function verificationOrigin(){
 const raw=process.env.QUITTANCE_VERIFICATION_ORIGIN||'https://lokly-git-fix-v3-9-lot-principal-lockly1.vercel.app'
 const url=new URL(raw)
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Adresse de vérification invalide')
 return url.origin
}
export function canonicalJson(value:unknown):string{
 if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']'
 if(value&&typeof value==='object')return '{'+Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonicalJson(v)).join(',')+'}'
 return JSON.stringify(value)
}
export function publicReceiptSnapshot(p:QuittancePdfData){
 const total=Math.round(p.total*100)/100,paid=Math.round(Number(p.totalPaye??0)*100)/100
 return {mois:p.mois,date_signature:p.dateSignature,total,total_paye:paid,montant_impaye:Math.max(0,Math.round((total-paid)*100)/100)}
}
export async function verifiedReceiptData(s:any,q:any,p:QuittancePdfData):Promise<QuittancePdfData>{
 // Never include joined relations in the optimistic concurrency check.
 const {locataires,biens,...source}=q
 const origin=verificationOrigin(),payload={...p,verificationOrigin:origin}
 const hash=createHash('sha256').update(canonicalJson(payload)).digest('hex')
 const {data,error}=await s.rpc('emettre_version_quittance',{p_quittance:q.id,p_source:source,p_empreinte:hash,p_payload:payload,p_public:publicReceiptSnapshot(p)})
 // Preserve existing PDFs until the database migration activates verification.
 if(error?.code==='PGRST202'||error?.code==='42883')return p
 if(error||!data)throw new VerificationSetupError('Vérification indisponible : exécutez la migration 20261026_verification_quittances.sql, puis réessayez. Si elle est déjà exécutée, rechargez la quittance.')
 const row=Array.isArray(data)?data[0]:data
 if(!row||!VERIFICATION_TOKEN.test(row.token)||!row.payload)throw new Error('Version de quittance invalide')
 const url=`${origin}/verifier#${row.token}`
 return {...row.payload,reference:row.reference,verification:{url,reference:row.reference,qrDataUrl:await QRCode.toDataURL(url,{errorCorrectionLevel:'M',margin:4,width:420})}}
}
