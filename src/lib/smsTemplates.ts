/** Preparation only: this module never contacts an SMS provider. */
export const SMS_SENDER='LE BAILLEUR'
export const SMS_FIELDS={date_debut:'Date de début des travaux',date_fin:'Date de fin des travaux',mail_bailleur:'Mail du bailleur',telephone_bailleur:'Téléphone du bailleur',nouveau_loyer_hc:'Nouveau loyer hors charges',date_effet:'Date d’effet',nom_locataire:'Nom du locataire',prenom:'Prénom du locataire',bien:'Bien concerné'} as const
export type SmsField=keyof typeof SMS_FIELDS
export const SMS_TEMPLATES=[
 {id:'travaux',title:'Travaux dans l’immeuble',kind:'group',body:"INFORMATION - Des travaux d'amélioration auront lieu dans votre immeuble du {date_debut} au {date_fin}. Merci de votre compréhension."},
 {id:'entretien',title:'Entretien des équipements',kind:'group',body:"INFORMATION - L'entretien des équipements de votre logement est prévu. Un technicien prendra contact avec vous pour convenir d'une date d'intervention."},
 {id:'charges',title:'Régularisation annuelle des charges',kind:'group',body:"INFORMATION - Votre décompte annuel de charges vous sera transmis prochainement. Il précisera votre quote-part et, le cas échéant, le montant et la date limite de paiement."},
 {id:'stationnement',title:'Stationnement devant les garages',kind:'group',body:"URGENT - Merci de ne pas stationner devant les portes des garages de l'immeuble et de transmettre cette consigne à vos visiteurs. Les accès doivent rester libres."},
 {id:'coordonnees',title:'Coordonnées du bailleur',kind:'group',body:"INFORMATION - Coordonnées de votre bailleur :\nMail : {mail_bailleur}\nMobile : {telephone_bailleur}\nHoraires : du lundi au samedi, de 9h à 18h.\nLe dimanche : uniquement en cas d'urgence.\nMerci."},
 {id:'revision',title:'Révision des loyers',kind:'group',body:"INFORMATION - Comme indiqué dans votre courrier de révision, votre loyer sera de {nouveau_loyer_hc} EUR hors charges à compter du {date_effet}. Pour toute question : {mail_bailleur}."},
 {id:'assurance',title:'Attestation d’assurance habitation',kind:'individual',body:"URGENT - L'attestation d'assurance habitation dont nous disposons est arrivée à expiration. Merci de transmettre votre attestation à jour à {mail_bailleur}."},
 {id:'reception',title:'Accusé de réception d’une demande',kind:'individual',body:"Votre demande a bien été reçue. Une réponse vous sera apportée dans les meilleurs délais. Votre bailleur."},
 {id:'loyer',title:'Rappel de paiement du loyer',kind:'individual',body:"RAPPEL - Le règlement de votre loyer doit nous parvenir au plus tard à la date prévue dans votre bail. Sauf paiement récent, merci de régulariser votre situation ou de contacter votre bailleur."},
] as const
const BASIC=new Set(Array.from("@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"))
const EXTENDED=new Set(Array.from('\f^{}\\[~]|€'))
export function smsSegments(text:string){
 let units=0,gsm=true
 for(const ch of text){if(BASIC.has(ch))units++;else if(EXTENDED.has(ch))units+=2;else{gsm=false;break}}
 if(!gsm)units=text.length // UTF-16 units: emoji count as two units.
 const single=gsm?160:70,multi=gsm?153:67
 return{encoding:gsm?'GSM-7':'Unicode',characters:Array.from(text).length,units,segments:units===0?0:units<=single?1:Math.ceil(units/multi)}
}
export function simplifySmsPunctuation(text:string){return text.replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/…/g,'...').replace(/[\u00a0\u202f]/g,' ')}
export function smsFields(body:string){return Array.from(new Set(Array.from(body.matchAll(/\{([^{}]+)\}/g),m=>m[1])))}
export function renderSms(body:string,values:Record<string,string>){
 const missing:string[]=[]
 const text=body.replace(/\{([^{}]+)\}/g,(_,key:string)=>{const value=Object.prototype.hasOwnProperty.call(values,key)&&typeof values[key]==='string'?values[key].trim():'';if(!value){missing.push(key);return '{'+key+'}'}return value})
 if(/[{}]/.test(body.replace(/\{[^{}]+\}/g,'')))missing.push('Champ entre accolades invalide')
 return{text,missing:Array.from(new Set(missing)),...smsSegments(text)}
}
export function normalizeSmsPhone(value:string|null|undefined){
 let phone=String(value??'').trim().replace(/[\s.()\-]/g,'')
 if(phone.startsWith('00'))phone='+'+phone.slice(2)
 if(/^0[67]\d{8}$/.test(phone))phone='+33'+phone.slice(1)
 if(phone.startsWith('+33')&&!/^\+33[67]\d{8}$/.test(phone))return null
 // Only French mobile prefixes are inferred. Foreign numbers require an explicit country code.
 return /^\+[1-9]\d{7,14}$/.test(phone)?phone:null
}
export type SmsRecipient={id:string;name:string;firstName:string;phone:string|null;propertyId:string|null;propertyName:string;active:boolean}
export type SmsPreview={recipient:SmsRecipient;phone:string|null;text:string;missing:string[];encoding:string;characters:number;units:number;segments:number;errors:string[];duplicateOf?:string}
export function prepareSms(recipients:SmsRecipient[],body:string,common:Record<string,string>,overrides:Record<string,Record<string,string>>={}){
 const seen=new Map<string,SmsPreview>()
 const previews:SmsPreview[]=recipients.map(recipient=>{
  const result=renderSms(body,{...common,...overrides[recipient.id],nom_locataire:recipient.name,prenom:recipient.firstName,bien:recipient.propertyName}),phone=normalizeSmsPhone(recipient.phone)
  const errors:string[]=[]
  const resolved={...common,...overrides[recipient.id]}
  for(const field of smsFields(body)){
   const value=Object.prototype.hasOwnProperty.call(resolved,field)&&typeof resolved[field]==='string'?resolved[field].trim():''
   if(!value)continue
   if(field==='nouveau_loyer_hc'&&(!/^\d+(?:[.,]\d{1,2})?$/.test(value)||Number(value.replace(',','.'))<=0))errors.push('Le nouveau loyer doit être un montant positif, avec deux décimales au maximum')
   if(['date_debut','date_fin','date_effet'].includes(field)){
    const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
    const date=match?new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00Z`):null
    if(!match||!date||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==`${match[3]}-${match[2]}-${match[1]}`)errors.push('Date invalide : '+field)
   }
   if(field==='mail_bailleur'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))errors.push('Adresse mail du bailleur invalide')
  }
  if(smsFields(body).includes('date_debut')&&smsFields(body).includes('date_fin')&&resolved.date_debut&&resolved.date_fin){
   const key=(v:string)=>v.split('/').reverse().join('-')
   if(key(resolved.date_fin)<key(resolved.date_debut))errors.push('La fin des travaux doit être postérieure ou égale au début')
  }
  if(!phone)errors.push('Numéro de mobile absent ou invalide')
  if(!result.text.trim())errors.push('Le message est vide')
  if(result.missing.length)errors.push('Champs à compléter : '+result.missing.join(', '))
  if(result.segments>10)errors.push('Message trop long : maximum 10 segments pour cette préparation')
  const preview:SmsPreview={recipient,phone,...result,errors}
  if(phone){const previous=seen.get(phone);if(previous){if(previous.text===preview.text){preview.duplicateOf=previous.recipient.id}else{preview.errors.push('Numéro partagé avec un autre destinataire, mais messages différents');previous.errors.push('Numéro partagé avec un autre destinataire, mais messages différents')}}else seen.set(phone,preview)}
  return preview
 })
 const unique=previews.filter(p=>!p.duplicateOf)
 return{previews,totalSegments:unique.reduce((s,p)=>s+p.segments,0),messages:unique.length,duplicateCount:previews.length-unique.length,ready:previews.length>0&&previews.every(p=>p.errors.length===0)}
}
