import {periodCashFlow} from './periodCashFlow'
import {rentalVacancy} from './rentalVacancy'
import {netPropertyValue} from './netPropertyValue'
import {rentalTotals,type RentalAssignment,type RentalSource,rentalDate} from './rentalTotals'
import {loanMonthlyCost,type LoanDeferral} from './loanDeferral'
import {investmentIrr} from './investmentPerformance'
export type PerformanceProperty={id:string;nom:string;ville:string;type:string;prix_achat?:number|null;frais_notaire?:number|null;frais_agence?:number|null;frais_courtage?:number|null;autres_frais_acquisition?:number|null;date_acquisition?:string|null;date_mise_location?:string|null;valeur_actuelle?:number|null;valeur_actuelle_date?:string|null}
export type PerformanceLease={id:string;bien_id:string;lot_id:string|null;loyer_hc:number;charges:number;historique_loyers?:unknown;date_entree:string;date_sortie:string|null;actif:boolean}
export type PerformancePayment={id:string;bien_id:string|null;locataire_id:string;montant:number;statut:string;date_paiement:string|null}
export type PerformanceExpense={id:string;bien_id:string|null;montant:number;date_depense:string;description?:string|null;categorie?:string}
export type PerformanceLoan=LoanDeferral&{bien_id:string;postes_finances?:unknown}
export type PerformanceData={biens:PerformanceProperty[];lots:{id:string;bien_id:string;type:string;nom_personnalise?:string|null;numero_lot?:string|null;date_mise_location?:string|null}[];baux:PerformanceLease[];paiements:PerformancePayment[];depenses:PerformanceExpense[];financements:PerformanceLoan[];locataires:{id:string;bien_id:string|null;bail_id:string|null;nom:string}[];affectations?:RentalAssignment[]}
export const performanceDate=rentalDate
const n=(value:unknown)=>Number(value??0)
export function propertyPerformance(bien:PerformanceProperty,data:PerformanceData,to=performanceDate()){
 const from=`${to.slice(0,4)}-01-01`,month=to.slice(0,7),baux=[...new Map(data.baux.filter(b=>b.bien_id===bien.id&&data.locataires.some(t=>t.bail_id===b.id)).map(b=>[b.id,b])).values()],lots=data.lots.filter(l=>l.bien_id===bien.id),locataires=data.locataires.filter(l=>l.bien_id===bien.id||!!l.bail_id&&baux.some(b=>b.id===l.bail_id)),tenantIds=new Set(locataires.map(l=>l.id))
 const paiements=data.paiements.filter(p=>p.bien_id===bien.id||!p.bien_id&&tenantIds.has(p.locataire_id)),depenses=data.depenses.filter(d=>d.bien_id===bien.id),fins=data.financements.filter(f=>f.bien_id===bien.id),fin=fins[0]??null
 const totals=rentalTotals({baux:data.baux,locataires:data.locataires as RentalSource[],affectations:data.affectations??[],bienId:bien.id,at:to})
 const rentRows=totals.rows.map(r=>({...r,label:lots.find(l=>l.id===r.lot_id)?.nom_personnalise?.trim()||lots.find(l=>l.id===r.lot_id)?.numero_lot||r.label})),loyerMensuel=totals.principalHC,chargesMensuelles=totals.charges,loyerAnnuel=loyerMensuel*12
 const flow=periodCashFlow({paiements,depenses,financements:fins,from,to}),{received,expenses,recettes,debt,margin,cash}=flow,depensesPeriode=flow.depenses,monthlyDebt=fins.reduce((s,f)=>s+loanMonthlyCost(f,month),0)
 const cost=n(bien.prix_achat)+n(bien.frais_notaire)+n(bien.frais_agence)+n(bien.frais_courtage)+n(bien.autres_frais_acquisition),gross=cost>0?loyerAnnuel/cost*100:null,net=cost>0?margin/cost*100:null
 const vacancy=rentalVacancy({biens:[bien],lots:data.lots,baux:data.baux,locataires:data.locataires,from,to}),{availableDays,emptyDays}=vacancy,vacance=vacancy.rate,netValue=netPropertyValue(bien,fins,to)
 const tri=investmentIrr(bien,paiements,depenses,fin)
 return {bien,from,to,cost,totals,rentRows,loyerMensuel,chargesMensuelles,loyerAnnuel,received,expenses,recettes,depenses:depensesPeriode,debt,monthlyDebt,margin,cash,gross,net,tri,vacance,availableDays,emptyDays,vacancy,netValue}
}
