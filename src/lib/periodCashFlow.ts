import {loanCostForPeriod,monthKeysBetween,type LoanDeferral} from './loanDeferral'
type Payment={id?:string;montant:number;statut:string;date_paiement:string|null}
type Expense={id?:string;montant:number;date_depense:string}
const date=(v:string|null|undefined)=>v?.slice(0,10)??''
const sum=(rows:{montant:number}[])=>rows.reduce((s,r)=>s+Math.round(Number(r.montant??0)*100),0)/100
const cents=(v:number)=>Math.round(v*100)/100
/** Cash received on receipt dates; expenses on their recorded dates. Loan costs
 * retain the existing monthly estimate (including deferral and insurance).
 * Every chart bucket is clipped to the same inclusive dates as the headline. */
export function periodCashFlow<P extends Payment,D extends Expense,F extends LoanDeferral>({paiements,depenses,financements,from,to}:{paiements:P[];depenses:D[];financements:F[];from:string;to:string}){
 const inRange=(v:string)=>!!v&&v>=from&&v<=to
 const received=paiements.filter(p=>['recu','partiel'].includes(p.statut)&&inRange(date(p.date_paiement)))
 const expenses=depenses.filter(d=>inRange(date(d.date_depense)))
 const recettes=sum(received),costs=sum(expenses),debt=cents(financements.reduce((s,f)=>s+loanCostForPeriod(f,from,to),0))
 const months=monthKeysBetween(from,to).map(key=>{
  const begin=from>`${key}-01`?from:`${key}-01`,last=new Date(Date.UTC(Number(key.slice(0,4)),Number(key.slice(5,7)),0)).toISOString().slice(0,10),end=to<last?to:last
  const receivedMonth=received.filter(p=>date(p.date_paiement).startsWith(key)),expensesMonth=expenses.filter(d=>date(d.date_depense).startsWith(key)),recettes=sum(receivedMonth),depenses=sum(expensesMonth),debt=cents(financements.reduce((s,f)=>s+loanCostForPeriod(f,begin,end),0))
  return{key,from:begin,to:end,received:receivedMonth,expenses:expensesMonth,recettes,depenses,debt,cash:cents(recettes-depenses-debt)}
 })
 return{from,to,received,expenses,recettes,depenses:costs,debt,margin:cents(recettes-costs),cash:cents(recettes-costs-debt),months}
}
