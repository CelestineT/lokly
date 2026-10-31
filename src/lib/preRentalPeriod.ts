import {calendarDay} from './rentalVacancy'
type Property={id:string;type:string;nom?:string;date_acquisition?:string|null;date_mise_location?:string|null}
type Unit={id:string;bien_id:string;type:string;date_mise_location?:string|null}
type Lease={bien_id?:string|null;lot_id?:string|null;date_entree?:string|null}
/** Preparation before rental availability, separate from rental vacancy; no inference of works. */
export function preRentalPeriod({biens,lots,baux,from,to,today,lotId}:{biens:Property[];lots:Unit[];baux:Lease[];from:string;to:string;today:string;lotId?:string}){
 const homes=new Set(['appartement','studio','maison']),start=calendarDay(from),end=calendarDay(to<today?to:today)
 let days=0,count=0,missing=0
 if(start===null||end===null||start>end)return {days:0,count:0,missing:0}
 for(const property of biens){const units=lots.filter(l=>l.bien_id===property.id&&homes.has(l.type));const selected:(Unit|null)[]=units.length?units.filter(l=>!lotId||l.id===lotId):!lotId&&homes.has(property.type)?[null]:[]
 for(const unit of selected){const acquired=calendarDay(property.date_acquisition);if(acquired===null){missing++;continue}
 const dates=[unit?.date_mise_location??property.date_mise_location,...baux.filter(b=>b.bien_id===property.id&&(unit?b.lot_id===unit.id||units.length===1&&!b.lot_id:!b.lot_id)).map(b=>b.date_entree)].map(calendarDay).filter((d):d is number=>d!==null)
 const until=Math.min(end,...dates.map(d=>d-1));const duration=Math.max(0,until-Math.max(start,acquired)+1);if(duration){days+=duration;count++}
 }}return {days,count,missing}
}
