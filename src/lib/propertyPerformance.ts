import {rentalTotals,type RentalAssignment,type RentalSource,rentalDate} from './rentalTotals'
import {loanCostForPeriod,loanMonthlyCost,type LoanDeferral} from './loanDeferral'
import {investmentIrr} from './investmentPerformance'
export type PerformanceProperty={id:string;nom:string;ville:string;type:string;prix_achat?:number|null;frais_notaire?:number|null;frais_agence?:number|null;frais_courtage?:number|null;autres_frais_acquisition?:number|null;date_acquisition?:string|null;date_mise_location?:string|null;valeur_actuelle?:number|null;valeur_actuelle_date?:string|null}
export type PerformanceLease={id:string;bien_id:string;lot_id:string|null;loyer_hc:number;charges:number;historique_loyers?:unknown;date_entree:string;date_sortie:string|null;actif:boolean}
export type PerformancePayment={id:string;bien_id:string|null;locataire_id:string;montant:number;statut:string;date_paiement:string|null}
export type PerformanceExpense={id:string;bien_id:string|null;montant:number;date_depense:string;description?:string|null;categorie?:string}
export type PerformanceLoan=LoanDeferral&{bien_id:string;postes_finances?:unknown}
export type PerformanceData={biens:PerformanceProperty[];lots:{id:string;bien_id:string;type:string;nom_personnalise?:string|null;numero_lot?:string|null}[];baux:PerformanceLease[];paiements:PerformancePayment[];depenses:PerformanceExpense[];financements:PerformanceLoan[];locataires:{id:string;bien_id:string|null;bail_id:string|null;nom:string}[];affectations?:RentalAssignment[]}
export const performanceDate=rentalDate
const n=(value:unknown)=>Number(value??0),HAB=new Set(['appartement','studio','maison']),DAY=86400000
function vacancy(bien:PerformanceProperty,lotId:string|null,baux:PerformanceLease[],from:string,to:string){
 const leases=baux.filter(b=>b.bien_id===bien.id&&(lotId?b.lot_id===lotId:!b.lot_id));
 const availability=bien.date_mise_location||leases.map(b=>b.date_entree).sort()[0]||bien.date_acquisition;if(!availability)return null
 const first=availability>from?availability:from;if(first>to)return null
 const date=(s:string)=>new Date(`${s}T00:00:00Z`).getTime()/DAY,begin=date(first),end=date(to),intervals=leases.map(b=>({s:Math.max(begin,date(b.date_entree)),e:Math.min(end,b.date_sortie?date(b.date_sortie):end)})).filter(x=>x.s<=x.e).sort((a,b)=>a.s-b.s)
 let occupied=0,last=begin-1;for(const x of intervals){const start=Math.max(last+1,x.s);if(start<=x.e)occupied+=x.e-start+1;last=Math.max(last,x.e)}
 return {available:end-begin+1,empty:Math.max(0,end-begin+1-occupied)}
}
export function propertyPerformance(bien:PerformanceProperty,data:PerformanceData,to=performanceDate()){
 const from=`${to.slice(0,4)}-01-01`,month=to.slice(0,7),baux=[...new Map(data.baux.filter(b=>b.bien_id===bien.id).map(b=>[b.id,b])).values()],lots=data.lots.filter(l=>l.bien_id===bien.id),locataires=data.locataires.filter(l=>l.bien_id===bien.id||!!l.bail_id&&baux.some(b=>b.id===l.bail_id)),tenantIds=new Set(locataires.map(l=>l.id))
 const paiements=data.paiements.filter(p=>p.bien_id===bien.id||!p.bien_id&&tenantIds.has(p.locataire_id)),depenses=data.depenses.filter(d=>d.bien_id===bien.id),fins=data.financements.filter(f=>f.bien_id===bien.id),fin=fins[0]??null
 const totals=rentalTotals({baux:data.baux,locataires:data.locataires as RentalSource[],affectations:data.affectations??[],bienId:bien.id,at:to})
 const rentRows=totals.rows.map(r=>({...r,label:lots.find(l=>l.id===r.lot_id)?.nom_personnalise?.trim()||lots.find(l=>l.id===r.lot_id)?.numero_lot||r.label})),loyerMensuel=totals.principalHC,chargesMensuelles=totals.charges,loyerAnnuel=loyerMensuel*12
 const received=paiements.filter(p=>['recu','partiel'].includes(p.statut)&&!!p.date_paiement&&p.date_paiement.slice(0,10)>=from&&p.date_paiement.slice(0,10)<=to),expenses=depenses.filter(d=>d.date_depense>=from&&d.date_depense<=to),recettes=received.reduce((s,p)=>s+n(p.montant),0),depensesPeriode=expenses.reduce((s,d)=>s+n(d.montant),0),debt=fins.reduce((s,f)=>s+loanCostForPeriod(f,from,to),0),monthlyDebt=fins.reduce((s,f)=>s+loanMonthlyCost(f,month),0),margin=recettes-depensesPeriode,cash=margin-debt
 const cost=n(bien.prix_achat)+n(bien.frais_notaire)+n(bien.frais_agence)+n(bien.frais_courtage)+n(bien.autres_frais_acquisition),gross=cost>0?loyerAnnuel/cost*100:null,net=cost>0?margin/cost*100:null
 const homes=lots.filter(l=>HAB.has(l.type)),units=homes.length?homes.map(l=>l.id):HAB.has(bien.type)?[null]:[],vacancyRows=units.map(id=>vacancy(bien,id,baux,from,to)).filter((v):v is {available:number;empty:number}=>v!==null),availableDays=vacancyRows.reduce((s,x)=>s+x.available,0),emptyDays=vacancyRows.reduce((s,x)=>s+x.empty,0),vacance=availableDays>0?emptyDays/availableDays*100:null
 const tri=investmentIrr(bien,paiements,depenses,fin)
 return {bien,from,to,cost,totals,rentRows,loyerMensuel,chargesMensuelles,loyerAnnuel,received,expenses,recettes,depenses:depensesPeriode,debt,monthlyDebt,margin,cash,gross,net,tri,vacance,availableDays,emptyDays}
}
