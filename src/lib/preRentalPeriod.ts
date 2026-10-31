import {calendarDay} from './rentalVacancy'
type Property={id:string;type:string;nom?:string;date_acquisition?:string|null;date_mise_location?:string|null}
type Unit={id:string;bien_id:string;type:string;nom_personnalise?:string|null;numero_lot?:string|null;date_mise_location?:string|null}
type Lease={bien_id?:string|null;lot_id?:string|null;date_entree?:string|null}
export type PreRentalRow={bienId:string;label:string;days:number;sinceAcquisition:number;from:string|null;to:string|null;available:string|null;issue:string|null}
const iso=(day:number)=>new Date(day*86400000).toISOString().slice(0,10)
/** Preparation before availability, never a replacement for rental vacancy. Days are clipped to the selected period. */
export function preRentalPeriod({biens,lots,baux,from,to,today,lotId}:{biens:Property[];lots:Unit[];baux:Lease[];from:string;to:string;today:string;lotId?:string}){
 const homes=new Set(['appartement','studio','maison']),start=calendarDay(from),end=calendarDay(to<today?to:today),rows:PreRentalRow[]=[]
 if(start===null||end===null||start>end)return {days:0,count:0,missing:0,rows,invalid:true}
 for(const property of biens){const units=lots.filter(l=>l.bien_id===property.id&&homes.has(l.type));const selected:(Unit|null)[]=units.length?units.filter(l=>!lotId||l.id===lotId):!lotId&&homes.has(property.type)?[null]:[]
 for(const unit of selected){const acquired=calendarDay(property.date_acquisition),label=[property.nom??'Bien',unit?.nom_personnalise||unit?.numero_lot].filter(Boolean).join(' — ')
 const dates=[unit?.date_mise_location??property.date_mise_location,...baux.filter(b=>b.bien_id===property.id&&(unit?b.lot_id===unit.id||units.length===1&&!b.lot_id:!b.lot_id)).map(b=>b.date_entree)].map(calendarDay).filter((d):d is number=>d!==null),available=dates.length?Math.min(...dates):null
 if(acquired===null){rows.push({bienId:property.id,label,days:0,sinceAcquisition:0,from:null,to:null,available:available===null?null:iso(available),issue:'Date d’acquisition manquante ou invalide.'});continue}
 const until=Math.min(end,available===null?end:available-1),begin=Math.max(start,acquired),duration=Math.max(0,until-begin+1)
 rows.push({bienId:property.id,label,days:duration,sinceAcquisition:Math.max(0,until-acquired+1),from:duration?iso(begin):null,to:duration?iso(until):null,available:available===null?null:iso(available),issue:null})
 }}return {days:rows.reduce((s,r)=>s+r.days,0),count:rows.filter(r=>r.days>0).length,missing:rows.filter(r=>r.issue).length,rows,invalid:false}
}
