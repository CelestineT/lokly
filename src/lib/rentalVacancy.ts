import {rentalDate} from './rentalTotals'
type Property={id:string;nom?:string;type:string;date_mise_location?:string|null}
type Unit={id:string;bien_id:string;type:string;nom_personnalise?:string|null;numero_lot?:string|null;date_mise_location?:string|null}
type Lease={id:string;bien_id?:string|null;lot_id?:string|null;date_entree?:string|null;date_sortie?:string|null;actif?:boolean|null}
type Tenant=Lease&{bail_id?:string|null}
const HOMES=new Set(['appartement','studio','maison']),DAY=86400000
export function calendarDay(value:string|null|undefined):number|null{if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const d=new Date(`${value}T00:00:00Z`);return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value?d.getTime()/DAY:null}
export type VacancyUnit={id:string|null;bien_id:string;label:string;availableDays:number;emptyDays:number;issue:string|null}
/** Calendar days, entry and departure included. Aggregate day counts, never average percentages. */
export function rentalVacancy({biens,lots,baux,locataires,from,to,lotId,today=rentalDate()}:{biens:Property[];lots:Unit[];baux:Lease[];locataires:Tenant[];from:string;to:string;lotId?:string;today?:string}){
 const endDate=to<today?to:today,start=calendarDay(from),end=calendarDay(endDate),units:VacancyUnit[]=[]
 if(start===null||end===null||calendarDay(to)===null||calendarDay(today)===null||start>end)return {rate:null,availableDays:0,emptyDays:0,units,issues:['Période d’observation invalide.'],from,to:endDate}
 const leases=[...new Map(baux.map(b=>[b.id,b])).values()],leaseIds=new Set(leases.map(b=>b.id)),members=new Set(locataires.map(t=>t.bail_id).filter(Boolean)),legacy=new Map<string,Tenant[]>()
 for(const t of locataires){if(t.bail_id&&leaseIds.has(t.bail_id))continue;const k=t.bail_id??t.id;legacy.set(k,[...(legacy.get(k)??[]),t])}
 // Without a surviving lease, use each occupant's actual dates. The union below
 // counts couples only once but preserves gaps and different dwelling IDs.
 for(const[id,group]of legacy)for(const t of group){const key=`legacy:${id}:${t.id}`;leases.push({...t,id:key});members.add(key)}
 const overlaps=(b:Lease,begin:number)=>{const s=calendarDay(b.date_entree),e=b.date_sortie?calendarDay(b.date_sortie):end;return s===null||e===null||e<s||s<=end&&e>=begin}
 for(const bien of [...new Map(biens.map(b=>[b.id,b])).values()]){
  const homes=[...new Map(lots.filter(l=>l.bien_id===bien.id&&HOMES.has(l.type)).map(l=>[l.id,l])).values()]
  const selected=lotId?homes.filter(l=>l.id===lotId):homes
  const candidates:(Unit|null)[]=selected.length?selected:!lotId&&HOMES.has(bien.type)&&homes.length===0?[null]:[]
  for(const unit of candidates){const label=unit?.nom_personnalise||unit?.numero_lot||bien.nom||'Logement',row:VacancyUnit={id:unit?.id??null,bien_id:bien.id,label,availableDays:0,emptyDays:0,issue:null},availability=calendarDay(unit?.date_mise_location??bien.date_mise_location);units.push(row)
   if(availability===null){row.issue='Date de mise en location manquante ou invalide.';continue}
   const begin=Math.max(start,availability);if(begin>end)continue
   const relevant=leases.filter(b=>b.bien_id===bien.id&&(unit?b.lot_id===unit.id||homes.length===1&&HOMES.has(bien.type)&&!b.lot_id:!b.lot_id)&&overlaps(b,begin))
   const ambiguous=leases.some(b=>b.bien_id===bien.id&&!b.lot_id&&!!unit&&!(homes.length===1&&HOMES.has(bien.type))&&overlaps(b,begin))
   if(ambiguous){row.issue='Un bail de cet immeuble n’est pas rattaché à un logement.';continue}
   if(leases.some(b=>b.bien_id===bien.id&&b.lot_id&&!lots.some(l=>l.id===b.lot_id&&l.bien_id===bien.id)&&overlaps(b,begin))){row.issue='Le lot rattaché à un bail est introuvable dans ce bien.';continue}
   const intervals:{s:number;e:number}[]=[]
   for(const b of relevant){const s=calendarDay(b.date_entree),e=b.date_sortie?calendarDay(b.date_sortie):end
    if(!members.has(b.id)){row.issue='Historique incomplet : un bail subsiste sans fiche locataire.';break}
    if(s===null||e===null||e<s||b.actif===false&&!b.date_sortie){row.issue='Dates d’entrée ou de sortie du bail incomplètes ou incohérentes.';break}
    const clipped={s:Math.max(begin,s),e:Math.min(end,e)};if(clipped.s<=clipped.e)intervals.push(clipped)
   }
   if(row.issue)continue
   intervals.sort((a,b)=>a.s-b.s);let occupied=0,last=begin-1
   for(const x of intervals){const s=Math.max(last+1,x.s);if(s<=x.e)occupied+=x.e-s+1;last=Math.max(last,x.e)}
   row.availableDays=end-begin+1;row.emptyDays=row.availableDays-occupied
  }
 }
 const availableDays=units.reduce((s,u)=>s+u.availableDays,0),emptyDays=units.reduce((s,u)=>s+u.emptyDays,0),issues=units.filter(u=>u.issue).map(u=>`${u.label} : ${u.issue}`)
 return {rate:issues.length||availableDays===0?null:emptyDays/availableDays*100,availableDays,emptyDays,units,issues,from,to:endDate}
}
