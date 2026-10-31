/** Materialize a single year's expense schedule; no automatic renewal. */
export function expenseDates(form:FormData):string[]{
 if(form.get('recurrente')!=='on')return [String(form.get('date_depense')??'')]
 const frequency=String(form.get('periodicite')??'');if(!['mensuelle','trimestrielle','semestrielle','annuelle'].includes(frequency))throw Error('Choisissez la périodicité.')
 if(frequency==='annuelle'){const date=String(form.get('date_depense')??'');if(!validExpenseDate(date))throw Error('Renseignez une date de prélèvement valide.');if(form.has('annee')&&Number(date.slice(0,4))!==Number(form.get('annee')))throw Error('La date doit appartenir à l’année choisie.');return [date]}
 const year=Number(form.get('annee')),day=Number(form.get('jour_mensuel'))
 if(!Number.isInteger(year)||year<1900||year>2100)throw Error('Renseignez une année valide (1900 à 2100).')
 let months:number[]
 if(frequency==='mensuelle'){if(!Number.isInteger(day)||day<1||day>31)throw Error('Choisissez un jour de prélèvement entre 1 et 31.');const first=String(form.get('debut_mensualites')??'');if(!validExpenseDate(first)||Number(first.slice(0,4))!==year)throw Error('Renseignez une date de début dans l’année choisie.');months=Array.from({length:12},(_,i)=>i+1).filter(m=>m>=Number(first.slice(5,7)))}
 else {months=form.getAll('mois_prelevement').map(Number);const count=frequency==='trimestrielle'?4:2,step=12/count;months.sort((a,b)=>a-b);if(months.length!==count||new Set(months).size!==count||months.some(m=>!Number.isInteger(m)||m<1||m>12)||months.slice(1).some((m,i)=>m-months[i]!==step))throw Error(`Choisissez ${count} mois espacés de ${step} mois.`)}
 const first=String(form.get('debut_mensualites')??'');if(first&&(!validExpenseDate(first)||Number(first.slice(0,4))!==year))throw Error('Renseignez une date de début dans l’année choisie.');if(!Number.isInteger(day)||day<1||day>31)throw Error('Choisissez un jour de prélèvement entre 1 et 31.');
 const dates=months.map(month=>`${year}-${String(month).padStart(2,'0')}-${String(Math.min(day,new Date(Date.UTC(year,month,0)).getUTCDate())).padStart(2,'0')}`)
 const selected=first?dates.filter(date=>date>=first):dates;if(!selected.length)throw Error('Aucune échéance après cette date de début dans l’année choisie.');return selected
}
export function validExpenseDate(date:string){const d=new Date(`${date}T12:00:00Z`);return /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date}
