export type RentRevision = {date_effet:string;loyer_hc:number;charges:number;motif?:string;enregistre_le?:string}
export type RentSource = {loyer_hc?:number|string|null;charges?:number|string|null;historique_loyers?:unknown;corrections_loyers?:unknown}
/** Calendar months, never UTC midnight: monthly billing has no daily proration. */
export function localMonth(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`}
export function rentRevisions(source:RentSource):RentRevision[]{
 if(!Array.isArray(source.historique_loyers))return []
 return source.historique_loyers.filter((r):r is RentRevision=>!!r&&typeof r==='object'&&/^\d{4}-(0[1-9]|1[0-2])-01$/.test(r.date_effet)&&typeof r.loyer_hc==='number'&&Number.isFinite(r.loyer_hc)&&r.loyer_hc>=0&&typeof r.charges==='number'&&Number.isFinite(r.charges)&&r.charges>=0).slice().sort((a,b)=>a.date_effet.localeCompare(b.date_effet))
}
export function rentAt(source:RentSource,month=localMonth()){
 const end=`${month.slice(0,7)}-01`,revision=rentRevisions(source).filter(r=>r.date_effet<=end).at(-1)
 return {loyer_hc:revision?.loyer_hc??Number(source.loyer_hc??0),charges:revision?.charges??Number(source.charges??0)}
}
export function withRentAt<T extends RentSource>(source:T,month=localMonth()):T{return {...source,...rentAt(source,month)}}
