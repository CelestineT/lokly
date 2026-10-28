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

export const entryMoney=(n:number)=>Math.round(n*100)/100
export function prorateAnnexes<T extends {date_debut?:string;date_fin?:string|null;prix_mensuel:number}>(rows:T[],month:string,entry:unknown){
 const[y,m]=month.split('-').map(Number),last=new Date(Date.UTC(y,m,0)).getUTCDate(),start=`${month}-01`,end=`${month}-${String(last).padStart(2,'0')}`,leaseStart=validCalendarDate(entry)
 return rows.map(row=>{const from=[start,row.date_debut??start,leaseStart??start].sort().at(-1)!,to=[end,row.date_fin??end].sort()[0],days=from>to?0:Math.round((Date.parse(`${to}T12:00:00Z`)-Date.parse(`${from}T12:00:00Z`))/86400000)+1;return{...row,prix_reference:row.prix_mensuel,jours_occupes:days,jours_mois:last,prix_mensuel:entryMoney(row.prix_mensuel*days/last)}})
}
export function validateEntryAmounts(fd:FormData,automatic:{loyer:number;charges:number;annexes:any[];caution:number;cautionPayee?:boolean}):{error:string}|{loyer:number;charges:number;annexes:any[];caution:number;cautionAffichee:boolean;cautionEncaissee:number;manual:boolean}{
 const manual=fd.get('montants_personnalises')==='on',loyer=manual?readReceiptAmount(fd.get('loyer_hc')):automatic.loyer,charges=manual?readReceiptAmount(fd.get('charges')):automatic.charges
 if(loyer===null||charges===null)return{error:'Saisissez des montants de loyer et de charges valides.'}
 let annexes=automatic.annexes
 if(fd.has('annexes_detail')){let raw:any;try{raw=JSON.parse(String(fd.get('annexes_detail')))}catch{return{error:'Les montants des annexes sont invalides.'}}if(!Array.isArray(raw)||raw.length!==annexes.length||new Set(raw.map(a=>a.lot_id)).size!==raw.length||raw.some(a=>!annexes.some(b=>b.lot_id===a.lot_id)||readReceiptAmount(a.prix_mensuel)===null))return{error:'Les annexes ont changé ou leurs montants sont invalides. Rechargez la fiche.'};annexes=annexes.map(a=>({...a,prix_mensuel:readReceiptAmount(raw.find(b=>b.lot_id===a.lot_id).prix_mensuel)!}))}
 const cautionAffichee=fd.get('caution_affichee')==='on',caution=cautionAffichee?(fd.has('caution_montant')?readReceiptAmount(fd.get('caution_montant')):automatic.caution):0,paid=cautionAffichee?(fd.has('caution_encaissee')?readReceiptAmount(fd.get('caution_encaissee')):automatic.cautionPayee?caution:0):0
 if(caution===null||!Number.isFinite(caution)||caution<0||paid===null||paid>caution)return{error:'La caution encaissée doit être comprise entre zéro et le montant de caution.'}
 return{loyer,charges,annexes,caution,cautionAffichee,cautionEncaissee:paid,manual}
}
/** Monthly receipts exclude deposits from rent income; deposits are counted once separately. */
export function receiptPaymentTotals(q:any,payments:any[],legacyCaution=0,legacyPaid=false){
 const caution=q.caution_affichee?Number(q.caution_montant??legacyCaution):0,active=payments.filter(p=>['recu','partiel'].includes(p.statut)),rent=entryMoney(active.reduce((n,p)=>n+Number(p.montant??0),0)),tracked=active.some(p=>p.caution_recue!=null),deposit=q.caution_encaissee!=null?Number(q.caution_encaissee):tracked?active.reduce((n,p)=>n+Number(p.caution_recue??0),0):(legacyPaid?caution:0)
 return{total:entryMoney(Number(q.total??0)+(q.caution_total_inclus?0:caution)),totalPaye:entryMoney(rent+(q.caution_affichee?deposit:0))}
}

/** A building's total area must never stand in for an individual dwelling. */
export function receiptSurface(bien:{type?:string|null;surface_m2?:number|string|null}|null|undefined,lot:{surface_m2?:number|string|null}|null|undefined):number|undefined{
 const value=lot?lot.surface_m2:['immeuble','immeuble_rapport'].includes(bien?.type??'')?undefined:bien?.surface_m2
 if(value==null||String(value).trim()==='')return undefined
 const number=Number(value);return Number.isFinite(number)&&number>0?number:undefined
}
