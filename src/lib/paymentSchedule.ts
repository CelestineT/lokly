import {annexeMonthBounds,annexesForMonth} from './annexeRows'
import {firstMonthProration,prorateAnnexes,entryMoney,validCalendarDate} from './receiptBilling'
import {rentAt} from './rentHistory'
import {rentalDate} from './rentalTotals'

type Lease={id:string;actif?:boolean|null;date_entree?:string|null;date_sortie?:string|null;loyer_hc?:number|null;charges?:number|null;historique_loyers?:unknown}
type Annex={id?:string;lot_id:string;date_debut:string;date_fin?:string|null;prix_mensuel:number}
type Payment={montant?:number|null;statut?:string|null;detail_echeance?:{total?:number|null;caution_montant?:number|null;regularisation_charges?:number|null}|null;solde_anterieur?:number|null}
/** Échéance du mois hors caution et dette antérieure ; ne modifie aucune donnée. */
export function paymentSchedule(lease:Lease,annexes:Annex[],payments:Payment[],month:string,asOfMonth=rentalDate().slice(0,7)){
 const bounds=annexeMonthBounds(month);if(!bounds)throw new Error('Mois invalide')
 const entry=validCalendarDate(lease.date_entree)
 if(!entry)return {due:null,received:null,unpaid:null,reason:'Date de début du bail manquante ou invalide.'}
 if(entry>bounds.end)return null
 if(lease.actif===false&&!lease.date_sortie)return {due:null,received:null,unpaid:null,reason:'Date de fin du bail manquante.'}
 if(lease.date_sortie&&!validCalendarDate(lease.date_sortie))return {due:null,received:null,unpaid:null,reason:'Date de fin du bail invalide.'}
 if(entry>bounds.end||lease.date_sortie&&lease.date_sortie<bounds.start)return null
 const recorded=payments.filter(p=>p.statut==='recu'||p.statut==='partiel')
 if(recorded.some(p=>!Number.isFinite(Number(p.montant))||Number(p.montant)<0))return {due:null,received:null,unpaid:null,reason:'Montant de paiement invalide : vérifiez les paiements.'}
 const paid=entryMoney(recorded.reduce((sum,p)=>sum+Number(p.montant??0),0))
 const snapshots=payments.flatMap(p=>{const d=p.detail_echeance;if(!d||d.total==null)return [];const amount=Number(d.total)-Number(p.solde_anterieur??0)-Number(d.caution_montant??0);return Number.isFinite(amount)?[entryMoney(amount)]:[]})
 const distinct=[...new Set(snapshots)]
 if(distinct.length>1)return {due:null,received:paid,unpaid:null,reason:'Les montants enregistrés pour ce mois sont différents : vérifiez les paiements.'}
 let due:number
 if(distinct.length)due=distinct[0]
 else if(month<asOfMonth)return {due:null,received:paid,unpaid:null,reason:'Montant historique non enregistré : vérifiez le bail et les paiements.'}
 else {const rent=rentAt(lease,month),prorata=firstMonthProration(rent.loyer_hc,rent.charges,lease.date_entree,month),lots=prorateAnnexes(annexesForMonth(annexes,month),month,lease.date_entree);due=entryMoney(prorata.loyer+prorata.charges+lots.reduce((sum,a)=>sum+Number(a.prix_mensuel),0))}
 if(!Number.isFinite(due)||due<0)return {due:null,received:paid,unpaid:null,reason:'Montant d’échéance invalide : vérifiez le bail et les paiements.'}
 return {due,received:paid,unpaid:Math.max(0,entryMoney(due-paid)),reason:null}
}

type ScheduleTenant={id:string;nom?:string|null;civilite?:string|null;nom_famille?:string|null;prenom?:string|null;bail_id?:string|null;bien_id?:string|null;est_principal?:boolean|null;actif?:boolean|null;date_entree?:string|null;date_sortie?:string|null;loyer_hc?:number|null;charges?:number|null;historique_loyers?:unknown}
type ScheduleLease=Lease&{bien_id?:string|null}
type SchedulePayment=Payment&{id?:string;locataire_id:string;mois:string;date_paiement?:string|null;mode_paiement?:string|null}
type ScheduleAnnex=Annex&{bail_id:string}
/** Une ligne par bail et par mois, y compris les baux sans paiement. */
export function paymentScheduleRows(leases:ScheduleLease[],tenants:ScheduleTenant[],annexes:ScheduleAnnex[],payments:SchedulePayment[],month:string){
 const bounds=annexeMonthBounds(month);if(!bounds)throw new Error('Mois invalide')
 const leaseMap=new Map(leases.map(l=>[l.id,l])),groups=new Map<string,ScheduleTenant[]>()
 for(const tenant of tenants){const key=tenant.bail_id?`bail:${tenant.bail_id}`:`locataire:${tenant.id}`;groups.set(key,[...(groups.get(key)??[]),tenant])}
 return [...groups.entries()].flatMap(([key,members])=>{
  const sorted=[...members].sort((a,b)=>Number(Boolean(b.est_principal))-Number(Boolean(a.est_principal))||a.id.localeCompare(b.id)),principal=sorted[0],lease=principal.bail_id?leaseMap.get(principal.bail_id):undefined,source=lease??principal
  const occupants=members.filter(t=>(!t.date_entree||t.date_entree<=bounds.end)&&(!t.date_sortie||t.date_sortie>=bounds.start))
  if(!occupants.length)return []
  const ids=new Set(members.map(t=>t.id)),entries=payments.filter(p=>p.mois.slice(0,7)===month&&ids.has(p.locataire_id)),related=lease?annexes.filter(a=>a.bail_id===lease.id):[]
  const schedule=paymentSchedule(source,related,entries,month);if(!schedule)return []
  const missingLease=!!principal.bail_id&&!lease,uncertain=members.some(t=>t.actif===false&&!t.date_sortie),mismatch=!!lease&&members.some(t=>t.bien_id&&lease.bien_id&&t.bien_id!==lease.bien_id)
  const result=missingLease?{...schedule,due:null,unpaid:null,reason:'Bail rattaché introuvable : vérifiez la fiche locataire.'}:mismatch?{...schedule,due:null,unpaid:null,reason:'Bien du locataire incohérent avec le bail.'}:uncertain?{...schedule,due:null,unpaid:null,reason:'Historique incomplet : date de sortie d’un occupant manquante.'}:schedule
  return [{key,bienId:source.bien_id??principal.bien_id??null,principalId:principal.id,occupants,members,payments:entries,...result}]
 })
}
