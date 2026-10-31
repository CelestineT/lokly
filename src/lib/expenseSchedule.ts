/** Materialize a single year's expense schedule; no automatic renewal. */
export function expenseDates(form:FormData):string[]{
 if(form.get('recurrente')!=='on')return [String(form.get('date_depense')??'')]
 const frequency=String(form.get('periodicite')??'');if(!['mensuelle','trimestrielle','semestrielle','annuelle'].includes(frequency))throw Error('Choisissez la périodicité.')
 if(frequency==='annuelle')return [String(form.get('date_depense')??'')]
 const year=Number(form.get('annee')),day=Number(form.get('jour_mensuel'))
 if(!Number.isInteger(year)||year<1900||year>2100)throw Error('Renseignez une année valide (1900 à 2100).')
 let months:number[]
 if(frequency==='mensuelle'){if(!Number.isInteger(day)||day<1||day>31)throw Error('Choisissez un jour de prélèvement entre 1 et 31.');months=Array.from({length:12},(_,i)=>i+1)}
 else {months=form.getAll('mois_prelevement').map(Number);const count=frequency==='trimestrielle'?4:2,step=12/count;months.sort((a,b)=>a-b);if(months.length!==count||new Set(months).size!==count||months.some(m=>!Number.isInteger(m)||m<1||m>12)||months.slice(1).some((m,i)=>m-months[i]!==step))throw Error(`Choisissez ${count} mois espacés de ${step} mois.`)}
 return months.map(month=>`${year}-${String(month).padStart(2,'0')}-${String(frequency==='mensuelle'?Math.min(day,new Date(Date.UTC(year,month,0)).getUTCDate()):1).padStart(2,'0')}`)
}
export function validExpenseDate(date:string){const d=new Date(`${date}T12:00:00Z`);return /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date}
