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

export type PaymentIncreaseInput=Omit<PrepaymentInput,'repayment'>&{newMonthlyPayment:number}
export type PaymentIncreaseResult={input:PaymentIncreaseInput;baseline:RepaymentSchedule;increased:RepaymentSchedule;monthsSaved:number;interestSaved:number;insuranceSaved:number|null;netSaved:number|null;monthlyEffort:number}
/** Permanent increase from the month following the balance snapshot; no upfront principal repayment. */
export function simulatePaymentIncrease(input:PaymentIncreaseInput):PaymentIncreaseResult{
 const {capital,annualRate,monthlyPayment,newMonthlyPayment,month,fees,insuranceMonthly}=input
 money(capital,'Capital restant dû',false);money(monthlyPayment,'Mensualité actuelle',false);money(newMonthlyPayment,'Nouvelle mensualité',false)
 if(newMonthlyPayment<=monthlyPayment)throw Error('La nouvelle mensualité doit être supérieure à la mensualité actuelle.')
 if(!Number.isFinite(annualRate)||annualRate<0||annualRate>100||Math.abs(annualRate*1000000-Math.round(annualRate*1000000))>1e-5)throw Error('Saisissez un taux nominal annuel compris entre 0 et 100 %, avec six décimales maximum.')
 if(!validLoanMonth(month))throw Error('Choisissez un mois valide.')
 if(fees!==null)money(fees,'Frais de modulation');if(insuranceMonthly!==null)money(insuranceMonthly,'Assurance mensuelle')
 const baseline=schedule(capital,annualRate,monthlyPayment,month,insuranceMonthly),increased=schedule(capital,annualRate,newMonthlyPayment,month,insuranceMonthly)
 const interestSaved=euros(cents(baseline.interest)-cents(increased.interest)),insuranceSaved=insuranceMonthly===null?null:euros(cents(baseline.insurance!)-cents(increased.insurance!))
 return{input:{...input},baseline,increased,monthsSaved:baseline.months-increased.months,interestSaved,insuranceSaved,netSaved:fees===null?null:euros(cents(interestSaved)+cents(insuranceSaved??0)-cents(fees)),monthlyEffort:euros(cents(newMonthlyPayment)-cents(monthlyPayment))}
}

export type SuccessiveInput=PrepaymentInput&{firstMonth:string;frequency:1|3|6|12}
export type SuccessiveRow=ScheduleRow&{extraPayment:number;fees:number|null}
export type SuccessiveResult={input:SuccessiveInput;baseline:RepaymentSchedule;successive:Omit<RepaymentSchedule,'rows'>&{rows:SuccessiveRow[]};payments:{month:string;amount:number;fees:number|null}[];totalExtra:number;totalFees:number|null;cashNeeded:number|null;monthsSaved:number;interestSaved:number;insuranceSaved:number|null;netSaved:number|null}
/** Recurring lump sums after the normal instalment; stop and cap automatically at settlement. */
export function simulateSuccessivePrepayments(input:SuccessiveInput):SuccessiveResult{
 const {capital,annualRate,monthlyPayment,repayment,month,fees,insuranceMonthly,firstMonth,frequency}=input
 money(capital,'Capital restant dû',false);money(monthlyPayment,'Mensualité',false);money(repayment,'Montant par versement',false)
 if(!Number.isFinite(annualRate)||annualRate<0||annualRate>100||Math.abs(annualRate*1000000-Math.round(annualRate*1000000))>1e-5)throw Error('Saisissez un taux nominal annuel compris entre 0 et 100 %, avec six décimales maximum.')
 if(!validLoanMonth(month)||!validLoanMonth(firstMonth)||firstMonth<=month)throw Error('Le premier versement doit intervenir après le mois de la situation de départ.')
 if(![1,3,6,12].includes(frequency))throw Error('Choisissez une fréquence mensuelle, trimestrielle, semestrielle ou annuelle.')
 if(fees!==null)money(fees,'Frais par versement');if(insuranceMonthly!==null)money(insuranceMonthly,'Assurance mensuelle')
 const baseline=schedule(capital,annualRate,monthlyPayment,month,insuranceMonthly),rows:SuccessiveRow[]=[],payments:SuccessiveResult['payments']=[]
 let balance=cents(capital),interestTotal=0,totalExtra=0
 const [y,m]=month.split('-').map(Number),[fy,fm]=firstMonth.split('-').map(Number),firstOffset=(fy-y)*12+fm-m,rateUnits=BigInt(Math.round(annualRate*1000000))
 for(let index=1;balance>0&&index<=MAX_MONTHS;index++){
  const interest=Number((BigInt(balance)*rateUnits+BigInt(600000000))/BigInt(1200000000)),due=balance+interest,payment=Math.min(cents(monthlyPayment),due),principal=payment-interest
  const extra=index>=firstOffset&&(index-firstOffset)%frequency===0?Math.min(cents(repayment),due-payment):0,remaining=due-payment-extra,key=shiftLoanMonth(month,index),rowFees=extra>0?fees:0
  rows.push({month:key,opening:euros(balance),interest:euros(interest),principal:euros(principal),payment:euros(payment),extraPayment:euros(extra),fees:rowFees,remaining:euros(remaining)})
  if(extra>0)payments.push({month:key,amount:euros(extra),fees})
  interestTotal+=interest;totalExtra+=extra;balance=remaining
 }
 if(balance>0)throw Error('Le remboursement dépasserait 50 ans. Vérifiez les paramètres.')
 const successive={months:rows.length,endMonth:rows.at(-1)!.month,monthlyPayment,lastPayment:rows.at(-1)!.payment,interest:euros(interestTotal),insurance:insuranceMonthly===null?null:euros(cents(insuranceMonthly)*rows.length),rows}
 const totalFees=payments.length===0?0:fees===null?null:euros(cents(fees)*payments.length),interestSaved=euros(cents(baseline.interest)-interestTotal),insuranceSaved=insuranceMonthly===null?null:euros(cents(baseline.insurance!)-cents(successive.insurance!))
 return{input:{...input},baseline,successive,payments,totalExtra:euros(totalExtra),totalFees,cashNeeded:totalFees===null?null:euros(totalExtra+cents(totalFees)),monthsSaved:baseline.months-successive.months,interestSaved,insuranceSaved,netSaved:totalFees===null?null:euros(cents(interestSaved)+cents(insuranceSaved??0)-cents(totalFees))}
}

export type TargetDateInput=Omit<PrepaymentInput,'repayment'>&{targetMonth:string}
export type TargetDateResult={input:TargetDateInput;targetMonths:number;baseline:RepaymentSchedule;target:RepaymentSchedule;monthlyDifference:number;monthsSaved:number;interestSaved:number;insuranceSaved:number|null;netSaved:number|null}
/** Lowest whole-cent fixed instalment which settles the loan by the requested month.
 * Uses the same monthly rounded-interest ledger as the other scenarios, rather than
 * a rounded theoretical PMT which could leave a balance after the target date. */
export function simulateTargetDate(input:TargetDateInput):TargetDateResult{
 const {capital,annualRate,monthlyPayment,month,targetMonth,fees,insuranceMonthly}=input
 money(capital,'Capital restant dû',false);money(monthlyPayment,'Mensualité actuelle',false)
 if(!Number.isFinite(annualRate)||annualRate<0||annualRate>100||Math.abs(annualRate*1000000-Math.round(annualRate*1000000))>1e-5)throw Error('Saisissez un taux nominal annuel compris entre 0 et 100 %, avec six décimales maximum.')
 if(!validLoanMonth(month)||!validLoanMonth(targetMonth))throw Error('Choisissez un mois de départ et une date de fin valides.')
 const[y,m]=month.split('-').map(Number),[ty,tm]=targetMonth.split('-').map(Number),targetMonths=(ty-y)*12+tm-m
 if(targetMonths<1||targetMonths>MAX_MONTHS)throw Error('La date de fin doit se situer entre le mois suivant la situation de départ et 50 ans après celle-ci.')
 if(fees!==null)money(fees,'Frais de modification');if(insuranceMonthly!==null)money(insuranceMonthly,'Assurance mensuelle')
 const baseline=schedule(capital,annualRate,monthlyPayment,month,insuranceMonthly),rateUnits=BigInt(Math.round(annualRate*1000000))
 function settlesBy(instalment:number){let balance=cents(capital);for(let index=0;balance>0&&index<targetMonths;index++){const interest=Number((BigInt(balance)*rateUnits+BigInt(600000000))/BigInt(1200000000));if(instalment<=interest)return false;balance=Math.max(0,balance+interest-instalment)}return balance===0}
 let low=1,high=cents(MAX_EUROS)
 if(!settlesBy(high))throw Error('La mensualité nécessaire dépasse la limite de 100 millions d’euros. Choisissez une date de fin plus éloignée.')
 while(low<high){const mid=Math.floor((low+high)/2);if(settlesBy(mid))high=mid;else low=mid+1}
 const target=schedule(capital,annualRate,euros(low),month,insuranceMonthly),interestSaved=euros(cents(baseline.interest)-cents(target.interest)),insuranceSaved=insuranceMonthly===null?null:euros(cents(baseline.insurance!)-cents(target.insurance!))
 return{input:{...input},targetMonths,baseline,target,monthlyDifference:euros(low-cents(monthlyPayment)),monthsSaved:baseline.months-target.months,interestSaved,insuranceSaved,netSaved:fees===null?null:euros(cents(interestSaved)+cents(insuranceSaved??0)-cents(fees))}
}
