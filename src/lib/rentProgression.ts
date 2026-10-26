import {rentalTotals,rentalDate,type RentalSource,type RentalAssignment} from './rentalTotals'
export type RentPoint={month:string;at:string;principal:number;annexes:number;total:number}
export function rentProgression({baux,locataires,affectations,from,to,bienId,lotId,today=rentalDate()}:{baux:RentalSource[];locataires:RentalSource[];affectations:RentalAssignment[];from:string;to:string;bienId?:string;lotId?:string;today?:string}):{points:RentPoint[];issues:string[]}{
 const valid=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(`${s}T12:00:00Z`))&&new Date(`${s}T12:00:00Z`).toISOString().slice(0,10)===s
 if(!valid(from)||!valid(to)||from>to)return{points:[],issues:['Choisissez une période valide.']}
 const end=to<today?to:today;if(from>end)return{points:[],issues:['Aucun loyer futur n’est projeté.']}
 const [fy,fm]=from.split('-').map(Number),[ey,em]=end.split('-').map(Number),count=(ey-fy)*12+em-fm+1
 if(count>120)return{points:[],issues:['Choisissez une période de dix ans maximum pour ce graphique.']}
 // Only dated, completed archives may be reconstructed; never revive an undated inactive lease.
 const archived=(s:RentalSource):RentalSource=>s.actif===false&&s.date_sortie&&valid(s.date_sortie)&&s.date_sortie<today?{...s,actif:true}:s
 const leases=baux.map(archived),tenants=locataires.map(archived),points:RentPoint[]=[],issues:string[]=[]
 const relevant=baux.filter(b=>(!bienId||b.bien_id===bienId)&&(!lotId||b.lot_id===lotId||affectations.some(a=>a.lot_id===lotId&&a.bail_id===b.id)))
 const ids=new Set(baux.map(b=>b.id)),legacy=locataires.filter(t=>(!t.bail_id||!ids.has(t.bail_id))&&(!bienId||t.bien_id===bienId)&&(!lotId||t.lot_id===lotId))
 if(relevant.some(b=>locataires.some(t=>t.bail_id===b.id)&&(!b.date_entree||!valid(b.date_entree)))||legacy.some(t=>!t.date_entree||!valid(t.date_entree)))return{points:[],issues:['Dates d’entrée manquantes ou invalides : complétez les baux pour afficher une progression historique fiable.']}
 if(relevant.some(b=>!locataires.some(t=>t.bail_id===b.id)||b.actif===false&&!b.date_sortie))issues.push('Historique incomplet : les baux sans occupant conservé ou sans date de sortie exploitable ne sont pas reconstitués.')
 for(let i=0;i<count;i++){const date=new Date(Date.UTC(fy,fm-1+i,1)),month=date.toISOString().slice(0,7),monthEnd=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).toISOString().slice(0,10),at=monthEnd<end?monthEnd:end,totals=rentalTotals({baux:leases,locataires:tenants,affectations,bienId,lotId,at});points.push({month,at,principal:totals.principalHC,annexes:totals.annexesTotal,total:totals.totalHC})}
 return{points,issues}
}
