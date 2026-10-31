import {SMS_TEMPLATES,SMS_FIELDS,smsFields,smsSegments} from './smsTemplates'
export type OwnerSmsTemplate={id:string;title:string;kind:'group'|'individual';body:string;origin?:string|null}
export const defaultSmsTemplates:OwnerSmsTemplate[]=SMS_TEMPLATES.map(t=>({...t}))
export function mergeSmsTemplates(saved:OwnerSmsTemplate[]){return [...defaultSmsTemplates.map(t=>saved.find(s=>s.origin===t.id)??t),...saved.filter(t=>!t.origin)]}
export function validateSmsTemplate(f:FormData){const title=String(f.get('title')??'').trim(),body=String(f.get('body')??'').trim(),kind=String(f.get('kind')??''),origin=String(f.get('origin')??'')||null,id=String(f.get('id')??'')||null;
 if(!title||title.length>120)throw Error('Renseignez un titre (120 caractères maximum).')
 if(!body||body.length>1600||smsSegments(body).segments>10)throw Error('Le texte doit contenir entre 1 et 1 600 caractères et au maximum 10 segments estimés.')
 if(!['group','individual'].includes(kind))throw Error('Choisissez un usage individuel ou groupé.')
 if(id&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw Error('Modèle invalide.')
 if(origin&&!defaultSmsTemplates.some(t=>t.id===origin))throw Error('Modèle d’origine invalide.')
 if(smsFields(body).some(k=>!Object.hasOwn(SMS_FIELDS,k))||/[{}]/.test(body.replace(/\{[^{}]+\}/g,'')))throw Error('Utilisez les champs personnalisables proposés sous le message.')
 return {title,body,kind:kind as OwnerSmsTemplate['kind'],origin,id}
}
