/** Labels of the selected charge items, without changing their stored identifiers. */
const labels:Record<string,string>={eau_froide:'Eau froide',eau_chaude:'Eau chaude',chauffage:'Chauffage',chauffage_collectif:'Chauffage collectif',electricite:'Électricité',electricite_communs:'Électricité des parties communes',entretien_communs:'Entretien des parties communes',ascenseur:'Ascenseur',teom:'Taxe d’enlèvement des ordures ménagères (TEOM)',gardiennage:'Gardiennage / concierge',espaces_verts:'Entretien des espaces verts',autre:'Autre'}
export function chargeDetails(values:unknown):string[]{return Array.isArray(values)?Array.from(new Set(values.filter((value):value is string=>typeof value==='string').map(chargeLabel).filter(Boolean))):[]}

export const CUSTOM_CHARGE_PREFIX='autre:'
export function customChargeName(values:unknown):string{
 return Array.isArray(values)?String(values.find(v=>typeof v==='string'&&v.startsWith(CUSTOM_CHARGE_PREFIX))??'').slice(CUSTOM_CHARGE_PREFIX.length):''
}
export function hasOtherCharge(values:string[]){return values.some(v=>v==='autre'||v.startsWith(CUSTOM_CHARGE_PREFIX))}
export function updateOtherCharge(values:string[],name:string){return [...values.filter(v=>v!=='autre'&&!v.startsWith(CUSTOM_CHARGE_PREFIX)),name?CUSTOM_CHARGE_PREFIX+name:'autre']}
export function chargeLabel(value:string){return value.startsWith(CUSTOM_CHARGE_PREFIX)?value.slice(CUSTOM_CHARGE_PREFIX.length).trim():labels[value]}
export function validChargeSelection(values:unknown):values is string[]{return Array.isArray(values)&&values.length<=30&&values.every(v=>typeof v==='string'&&(v==='autre'?false:v.startsWith(CUSTOM_CHARGE_PREFIX)?v.slice(CUSTOM_CHARGE_PREFIX.length).trim().length>0&&v.slice(CUSTOM_CHARGE_PREFIX.length).length<=120:!!labels[v]))}
export const CHARGE_OPTIONS=Object.entries(labels)
