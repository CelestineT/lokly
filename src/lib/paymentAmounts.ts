/** Calculs en centimes : le solde antérieur est une dette, jamais une recette. */
export function paymentAmounts(monthDue:number,received:number,previousBalance=0){
 const cents=(n:number)=>Math.max(0,Math.round((Number.isFinite(n)?n:0)*100));
 const due=cents(monthDue),paid=cents(received),previous=cents(previousBalance);
 return {monthRemaining:Math.max(0,due-paid)/100,remaining:Math.max(0,due+previous-paid)/100,status:paid===0&&due+previous>0?'en_retard':paid<due+previous?'partiel':'recu'} as const
}
export function schemaMessage(message:string){return /schema cache|column .*does not exist|could not find.*column/i.test(message)?'Ce nouveau champ nécessite la mise à jour Supabase du 17 octobre. Les données existantes sont conservées.':message}
