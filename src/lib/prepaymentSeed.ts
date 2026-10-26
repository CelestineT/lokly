import {remainingLoanBalance} from './investmentPerformance'
import {validateDeferral,type LoanDeferral} from './loanDeferral'
import {validLoanMonth} from './loanPrepayment'
export type SimulatorLoan=LoanDeferral&{id:string;bien_id:string;nom:string;ville:string}
export function prepaymentBlock(loan:LoanDeferral,month:string):string|null{
 if(loan.differe_type&&loan.differe_type!=='aucun'){
  const error=validateDeferral(loan.differe_type,loan.differe_debut??null,loan.differe_fin??null,loan.differe_mensualite??null,loan.date_debut??null,loan.date_fin??null)
  if(error)return 'Les modalités du différé sont incomplètes. Corrigez-les dans le financement avant de simuler.'
  if(month<=loan.differe_fin!.slice(0,7))return `Cette première version simule un remboursement après le différé, qui se termine en ${loan.differe_fin!.slice(0,7)}. Choisissez un mois ultérieur.`
 }
 return null
}
export function estimatedPrepaymentCapital(loan:LoanDeferral,month:string):number|null{
 if(!validLoanMonth(month)||!loan.date_debut||!/^\d{4}-\d{2}-\d{2}$/.test(loan.date_debut)||month<loan.date_debut.slice(0,7)||prepaymentBlock(loan,month))return null
 const start=new Date(`${loan.date_debut}T00:00:00Z`);if(!Number.isFinite(start.getTime())||start.toISOString().slice(0,10)!==loan.date_debut)return null
 if([loan.montant_emprunte,loan.mensualite,loan.taux_nominal].some(value=>value==null||!Number.isFinite(Number(value))||Number(value)<0))return null
 const[y,m]=month.split('-').map(Number),end=new Date(Date.UTC(y,m,0)).toISOString().slice(0,10),balance=remainingLoanBalance({...loan,date_debut:`${loan.date_debut.slice(0,7)}-01`},end)
 return Number.isFinite(balance)&&balance>=0?Math.round(balance*100)/100:null
}
