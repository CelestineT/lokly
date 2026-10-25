export function validCalendarDate(value:unknown):string|null{
 const day=String(value??'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return null
 const d=new Date(`${day}T12:00:00Z`);return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===day?day:null
}
export function formatReceiptDate(value:unknown){const day=validCalendarDate(value);return day?new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric',timeZone:'Europe/Paris'}):'Non renseignée'}
export function firstMonthProration(loyer:number,charges:number,dateEntree:unknown,month:string){
 const entry=validCalendarDate(dateEntree),applied=!!entry&&entry.slice(0,7)===month&&Number(entry.slice(8))>1
 const[y,m]=month.split('-').map(Number),daysInMonth=new Date(Date.UTC(y,m,0)).getUTCDate(),days=applied?daysInMonth-Number(entry!.slice(8))+1:daysInMonth
 const round=(n:number)=>Math.round(n*100)/100
 return{applied,loyer:round(applied?loyer*days/daysInMonth:loyer),charges:round(applied?charges*days/daysInMonth:charges),detail:applied?{date_entree:entry!,jours_occupes:days,jours_mois:daysInMonth,loyer_mensuel:loyer,charges_mensuelles:charges,manuel:false}:null}
}
export function readReceiptAmount(value:unknown){const text=String(value??'').trim().replace(',','.');if(!/^\d+(?:\.\d{1,2})?$/.test(text))return null;const n=Number(text);return Number.isFinite(n)&&n<=999999999.99?n:null}
