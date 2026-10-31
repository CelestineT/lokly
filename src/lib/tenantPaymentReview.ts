import {paymentScheduleRows} from './paymentSchedule'
import {rentalDate} from './rentalTotals'
import {validCalendarDate} from './receiptBilling'

/** Only explicit contractual deadlines are interpreted; unknown terms never imply lateness. */
export function paymentDeadline(terms:unknown,month:string){
 const text=String(terms??'').trim().toLowerCase(),match=text.match(/^(avant le|au plus tard le|le|chaque|avant le jour)\s+(\d{1,2})(?:\s|$)/)
 if(!match)return null
 const day=Number(match[2]);if(day<1||day>31)return null
 const [year,m]=month.split('-').map(Number),last=new Date(Date.UTC(year,m,0)).getUTCDate()
 const due=new Date(Date.UTC(year,m-1,Math.min(day,last)))
 if(match[1].startsWith('avant'))due.setUTCDate(due.getUTCDate()-1)
 return due.toISOString().slice(0,10)
}
export function tenantPaymentReview(lease:any,members:any[],annexes:any[],payments:any[],receipts:any[],today=rentalDate()){
 const rows:Array<{month:string;deadline:string|null;status:string}>=[]
 const current=new Date(`${today.slice(0,7)}-01T12:00:00Z`)
 for(let i=11;i>=0;i--){const date=new Date(current);date.setUTCMonth(date.getUTCMonth()-i);const month=date.toISOString().slice(0,7)
  const r=paymentScheduleRows(lease?[lease]:[],members,annexes,payments,month,receipts)[0];if(!r)continue
  const terms=lease?.mode_paiement??members.find(t=>t.est_principal)?.mode_paiement??members[0]?.mode_paiement
  let deadline=paymentDeadline(terms,month)
  const entry=validCalendarDate(lease?.date_entree??members[0]?.date_entree);if(deadline&&entry&&entry>deadline)deadline=entry
  if(!deadline||r.due===null){rows.push({month,deadline,status:'À vérifier'});continue}
  if(deadline>today){rows.push({month,deadline,status:'À venir'});continue}
  const paid=r.payments.filter(p=>['recu','partiel'].includes(p.statut??'')),invalid=paid.some(p=>!validCalendarDate(p.date_paiement)||validCalendarDate(p.date_paiement)!>today||!Number.isFinite(Number(p.montant))||Number(p.montant)<0)
  const onTime=paid.filter(p=>validCalendarDate(p.date_paiement)!<=deadline).reduce((n,p)=>n+Number(p.montant??0),0)
  const status=invalid?'À vérifier':onTime+.005>=r.due?'À l’heure':(r.unpaid??0)>.005?'Échéance non soldée':'Payé en retard'
  rows.push({month,deadline,status})
 }
 const count=(s:string)=>rows.filter(r=>r.status===s).length,onTime=count('À l’heure'),late=count('Payé en retard'),unpaid=count('Échéance non soldée'),unknown=count('À vérifier'),assessed=onTime+late+unpaid
 return {rows,onTime,late,unpaid,unknown,upcoming:count('À venir'),score:assessed?Math.round(100*onTime/assessed):null,label:unpaid?'Échéances à solder':late?'Ponctualité à surveiller':unknown?'Données à compléter':assessed?'Paiements ponctuels':'Historique insuffisant'}
}
