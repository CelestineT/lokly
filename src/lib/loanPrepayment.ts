/** Monthly, fixed-rate, amortizing-loan scenarios. No database writes or actual repayment instructions. */
export type PrepaymentInput={capital:number;annualRate:number;monthlyPayment:number;repayment:number;month:string;fees:number|null;insuranceMonthly:number|null}
export type ScheduleRow={month:string;opening:number;interest:number;principal:number;payment:number;remaining:number}
export type RepaymentSchedule={months:number;endMonth:string;monthlyPayment:number;lastPayment:number;interest:number;insurance:number|null;rows:ScheduleRow[]}
export type PrepaymentResult={input:PrepaymentInput;remainingCapital:number;cashNeeded:number|null;baseline:RepaymentSchedule;shorter:RepaymentSchedule;lower:RepaymentSchedule;shorterSavings:ScenarioSavings;lowerSavings:ScenarioSavings}
export type ScenarioSavings={monthsSaved:number;interestSaved:number;insuranceSaved:number|null;netSaved:number|null;monthlyRelief:number}
const MAX_MONTHS=600,MAX_EUROS=100000000
const cents=(value:number)=>Math.round(value*100),euros=(value:number)=>value/100
export function validLoanMonth(month:string){return /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month)}
export function shiftLoanMonth(month:string,count:number){if(!validLoanMonth(month)||!Number.isInteger(count))throw Error('Mois invalide.');const[y,m]=month.split('-').map(Number),date=new Date(Date.UTC(y,m-1+count,1));return date.toISOString().slice(0,7)}
function money(value:number,label:string,zero=true){if(!Number.isFinite(value)||value<0||!zero&&value===0||value>MAX_EUROS||Math.abs(value*100-cents(value))>1e-5)throw Error(`${label} : saisissez un montant ${zero?'positif ou nul':'strictement positif'}, avec deux décimales maximum (100 millions d’euros maximum).`)}
function schedule(capital:number,annualRate:number,payment:number,month:string,insuranceMonthly:number|null,fixedMonths?:number):RepaymentSchedule{
 let balance=cents(capital),interestTotal=0;const rows:ScheduleRow[]=[],instalment=cents(payment),rateUnits=BigInt(Math.round(annualRate*1000000))
 if(balance===0)return{months:0,endMonth:month,monthlyPayment:0,lastPayment:0,interest:0,insurance:insuranceMonthly===null?null:0,rows}
 for(let index=1;balance>0&&index<=MAX_MONTHS;index++){
  const interest=Number((BigInt(balance)*rateUnits+BigInt(600000000))/BigInt(1200000000)),due=balance+interest
  if(instalment<=interest&&fixedMonths!==index)throw Error('La mensualité ne couvre pas les intérêts : ce prêt ne peut pas être simulé comme un crédit amortissable.')
  const actual=fixedMonths===index?due:Math.min(instalment,due),principal=actual-interest,remaining=balance-principal
  if(!Number.isSafeInteger(due)||remaining<0)throw Error('Les montants dépassent la capacité du simulateur.')
  rows.push({month:shiftLoanMonth(month,index),opening:euros(balance),interest:euros(interest),principal:euros(principal),payment:euros(actual),remaining:euros(remaining)});interestTotal+=interest;balance=remaining
  if(fixedMonths&&index>=fixedMonths)break
 }
 if(balance>0)throw Error('Le remboursement dépasserait 50 ans. Vérifiez le capital, le taux et la mensualité.')
 return{months:rows.length,endMonth:rows.at(-1)!.month,monthlyPayment:payment,lastPayment:rows.at(-1)!.payment,interest:euros(interestTotal),insurance:insuranceMonthly===null?null:euros(cents(insuranceMonthly)*rows.length),rows}
}
export function simulatePrepayment(input:PrepaymentInput):PrepaymentResult{
 const {capital,annualRate,monthlyPayment,repayment,month,fees,insuranceMonthly}=input
 money(capital,'Capital restant dû',false);money(monthlyPayment,'Mensualité',false);money(repayment,'Remboursement anticipé',false)
 if(repayment>capital)throw Error('Le remboursement anticipé ne peut pas dépasser le capital restant dû.')
 if(!Number.isFinite(annualRate)||annualRate<0||annualRate>100||Math.abs(annualRate*1000000-Math.round(annualRate*1000000))>1e-5)throw Error('Saisissez un taux nominal annuel compris entre 0 et 100 %, avec six décimales maximum.')
 if(!validLoanMonth(month))throw Error('Choisissez un mois de remboursement valide.')
 if(fees!==null)money(fees,'Frais et indemnités');if(insuranceMonthly!==null)money(insuranceMonthly,'Assurance mensuelle')
 const baseline=schedule(capital,annualRate,monthlyPayment,month,insuranceMonthly),remainingCapital=euros(cents(capital)-cents(repayment)),shorter=schedule(remainingCapital,annualRate,monthlyPayment,month,insuranceMonthly)
 const rate=annualRate/1200,n=baseline.months,payment=remainingCapital===0?0:rate===0?remainingCapital/n:remainingCapital*rate/(-Math.expm1(-n*Math.log1p(rate)))
 const lower=schedule(remainingCapital,annualRate,euros(Math.max(1,cents(payment))),month,insuranceMonthly,n)
 const savings=(scenario:RepaymentSchedule):ScenarioSavings=>{const interestSaved=euros(cents(baseline.interest)-cents(scenario.interest)),insuranceSaved=insuranceMonthly===null?null:euros(cents(baseline.insurance!)-cents(scenario.insurance!));return{monthsSaved:baseline.months-scenario.months,interestSaved,insuranceSaved,netSaved:fees===null?null:euros(cents(interestSaved)+cents(insuranceSaved??0)-cents(fees)),monthlyRelief:euros(cents(monthlyPayment)-cents(scenario.monthlyPayment)+(scenario.months===0?cents(insuranceMonthly??0):0))}}
 return{input:{...input},remainingCapital,cashNeeded:fees===null?null:euros(cents(repayment)+cents(fees)),baseline,shorter,lower,shorterSavings:savings(shorter),lowerSavings:savings(lower)}
}
