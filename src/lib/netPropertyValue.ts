import {remainingLoanBalance} from './investmentPerformance'
import {calendarDay} from './rentalVacancy'
import {rentalDate} from './rentalTotals'
import {validateDeferral,type LoanDeferral} from './loanDeferral'
export const NET_VALUE_HELP='Somme estimée que vous pourriez récupérer en vendant ce bien à sa valeur actuelle, après remboursement des crédits restants, avant frais de vente et fiscalité. Votre apport initial est compris dans cette somme.'
export type NetValue={value:number|null;remainingDebt:number|null;reason:string|null;at:string;valuationDate:string|null}
export function netPropertyValue(bien:{valeur_actuelle?:number|null;valeur_actuelle_date?:string|null},loans:LoanDeferral[],at=rentalDate()):NetValue{
 const result=(value:number|null,remainingDebt:number|null,reason:string|null):NetValue=>({value,remainingDebt,reason,at,valuationDate:bien.valeur_actuelle_date??null})
 if(bien.valeur_actuelle==null||!Number.isFinite(Number(bien.valeur_actuelle))||Number(bien.valeur_actuelle)<0)return result(null,null,'Renseignez une valeur actuelle du bien.')
 if(calendarDay(bien.valeur_actuelle_date)===null||bien.valeur_actuelle_date!>at)return result(null,null,'Renseignez une date d’estimation valide, au plus tard aujourd’hui.')
 if(!loans.length)return result(null,null,'Complétez le financement ; indiquez un montant emprunté de 0 € si le bien est sans crédit.')
 let debt=0
 for(const f of loans){if(f.montant_emprunte==null||!Number.isFinite(Number(f.montant_emprunte))||Number(f.montant_emprunte)<0)return result(null,null,'Montant emprunté manquant ou invalide.')
  if(Number(f.montant_emprunte)===0)continue
  if(calendarDay(f.date_debut)===null)return result(null,null,'Date de début du crédit manquante ou invalide.')
  if(f.date_debut!>at)continue
  if(f.mensualite==null||f.taux_nominal==null||![Number(f.mensualite),Number(f.taux_nominal)].every(n=>Number.isFinite(n)&&n>=0))return result(null,null,'Complétez la mensualité et le taux du crédit pour estimer la dette restante.')
  if(f.differe_type&&f.differe_type!=='aucun'&&validateDeferral(f.differe_type,f.differe_debut??null,f.differe_fin??null,f.differe_mensualite??null,f.date_debut??null,f.date_fin??null))return result(null,null,'Complétez les modalités du différé pour estimer la dette restante.')
  const balance=remainingLoanBalance(f,at);if(!Number.isFinite(balance)||balance<0)return result(null,null,'Capital restant dû non calculable.');debt+=balance
 }
 debt=Math.round(debt*100)/100;return result(Math.round((Number(bien.valeur_actuelle)-debt)*100)/100,debt,null)
}
