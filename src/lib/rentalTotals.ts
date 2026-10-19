import {rentAt,type RentSource} from './rentHistory'
import {uniqueAnnexes} from './annexeRows'
export type RentalSource=RentSource&{id:string;bien_id?:string|null;bail_id?:string|null;lot_id?:string|null;date_entree?:string|null;date_sortie?:string|null;actif?:boolean|null;nom?:string;est_principal?:boolean|null}
export type RentalAssignment={id?:string;bail_id:string;lot_id:string;date_debut:string;date_fin:string|null;prix_mensuel:number|string|null}
export const rentalDate=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
const amount=(v:unknown)=>Math.round(Number(v??0)*100)/100
export function rentalIsCurrent(source:{actif?:boolean|null;date_entree?:string|null;date_sortie?:string|null},at=rentalDate()){return source.actif!==false&&(!source.date_entree||source.date_entree<=at)&&(!source.date_sortie||source.date_sortie>=at)}
export function rentalPrincipal<T extends RentalSource>(group:T[],at=rentalDate()):T{const sorted=[...group].sort((a,b)=>a.id.localeCompare(b.id)),current=sorted.filter(t=>rentalIsCurrent(t,at));return current.find(t=>t.est_principal)??current[0]??sorted.find(t=>t.est_principal)??sorted[0]}
export function annexesAt<T extends RentalAssignment>(rows:T[],at=rentalDate()):T[]{return uniqueAnnexes(rows.filter(a=>a.date_debut<=at&&(!a.date_fin||a.date_fin>=at)))}
export function leaseAmounts<T extends RentalAssignment>(source:RentSource,rows:T[],at=rentalDate()){
 const rent=rentAt(source,at.slice(0,7)),annexes=annexesAt(rows,at),annexesTotal=amount(annexes.reduce((s,a)=>s+amount(a.prix_mensuel),0)),loyer=amount(rent.loyer_hc),charges=amount(rent.charges)
 return {loyer,charges,annexes,annexesTotal,total:amount(loyer+charges+annexesTotal)}
}
/** A lease without any surviving occupant is not an ongoing rental. Legacy tenant records without a matching lease remain supported. */
export function rentalTotals({baux,locataires=[],affectations=[],bienId,lotId,at=rentalDate()}:{baux:RentalSource[];locataires?:RentalSource[];affectations?:RentalAssignment[];bienId?:string;lotId?:string;at?:string}){
 const members=new Map<string,RentalSource[]>();for(const tenant of locataires){if(tenant.bail_id)members.set(tenant.bail_id,[...(members.get(tenant.bail_id)??[]),tenant])}
 const leases=new Map(baux.map(b=>[b.id,b])),contracts:RentalSource[]=[...leases.values()].filter(b=>members.has(b.id))
 const fallback=new Map<string,RentalSource[]>();for(const tenant of locataires){if(tenant.bail_id&&leases.has(tenant.bail_id))continue;const key=tenant.bail_id?`bail:${tenant.bail_id}`:`loc:${tenant.id}`;fallback.set(key,[...(fallback.get(key)??[]),tenant])}
 for(const [id,group]of fallback){const principal=rentalPrincipal(group,at);contracts.push({...principal,id,bail_id:principal.bail_id??null})}
 const active=contracts.filter(b=>rentalIsCurrent(b,at)&&(!leases.has(b.id)||(members.get(b.id)??[]).some(t=>rentalIsCurrent(t,at)))&&(!bienId||b.bien_id===bienId))
 const rows=active.filter(b=>!lotId||b.lot_id===lotId).map(b=>{const member=locataires.find(t=>t.bail_id===b.id&&t.est_principal)??locataires.find(t=>t.bail_id===b.id);return{id:b.id,bail_id:b.bail_id??(leases.has(b.id)?b.id:null),bien_id:b.bien_id??null,lot_id:b.lot_id??null,label:member?.nom??b.nom??'Bail',...rentAt(b,at.slice(0,7))}})
 const activeLeaseIds=new Set(active.flatMap(b=>{const id=b.bail_id??(leases.has(b.id)?b.id:null);return id?[id]:[]})),principalLots=new Set(active.map(b=>b.lot_id).filter(Boolean))
 const annexes=annexesAt(affectations.filter(a=>activeLeaseIds.has(a.bail_id)&&(!lotId||a.lot_id===lotId)&&!principalLots.has(a.lot_id)),at)
 const principalHC=amount(rows.reduce((s,r)=>s+amount(r.loyer_hc),0)),charges=amount(rows.reduce((s,r)=>s+amount(r.charges),0)),annexesTotal=amount(annexes.reduce((s,a)=>s+amount(a.prix_mensuel),0))
 return{rows,annexes,principalHC,charges,annexesTotal,totalHC:amount(principalHC+annexesTotal),totalCC:amount(principalHC+charges+annexesTotal)}
}
