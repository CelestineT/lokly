import {firstMonthProration,prorateAnnexes,validateEntryAmounts,entryMoney,readReceiptAmount} from './receiptBilling'
import {rentAt} from './rentHistory'
import {loadBailAnnexes} from './loadBailAnnexes'
import {parseChargeRegularisation} from './chargeRegularisation'
export async function resolveRentalEntry(s:any,ownerId:string,fd:FormData){
 const id=String(fd.get('locataire_id')??''),mois=String(fd.get('mois')??'');if(!id||!/^\d{4}-(0[1-9]|1[0-2])$/.test(mois))return{ok:false as const,error:'Choisissez un bail et un mois valides.'}
 const{data:loc,error:le}=await s.from('locataires').select('*').eq('id',id).eq('proprietaire_id',ownerId).single();if(le||!loc)return{ok:false as const,error:'Locataire introuvable.'}
 let source=loc;const bailId=loc.bail_id as string|null
 if(bailId){const{data:b,error}=await s.from('baux').select('*').eq('id',bailId).eq('proprietaire_id',ownerId).single();if(error||!b)return{ok:false as const,error:'Bail introuvable.'};source=b}
 const rent=rentAt(source,mois),prorata=firstMonthProration(rent.loyer_hc,rent.charges,source.date_entree,mois)
 let annexes:any[]=[];if(bailId){try{annexes=prorateAnnexes((await loadBailAnnexes(s,bailId,loc.bien_id,mois,ownerId)).rows,mois,source.date_entree)}catch(e){return{ok:false as const,error:e instanceof Error?e.message:'Impossible de vérifier les annexes.'}}}
 const amounts=validateEntryAmounts(fd,{...prorata,annexes,caution:Number(source.caution??0),cautionPayee:source.caution_payee});if('error' in amounts)return{ok:false as const,error:amounts.error}
 const regularisation=parseChargeRegularisation(fd.get('regularisation_charges'),fd.get('regularisation_periode'));if(regularisation.error)return{ok:false as const,error:regularisation.error}
 const solde=fd.has('solde')?readReceiptAmount(fd.get('solde')||'0'):readReceiptAmount(fd.get('solde_anterieur')||'0');if(solde===null)return{ok:false as const,error:'Le solde antérieur est invalide.'}
 const lotsTotal=entryMoney(amounts.annexes!.reduce((n:number,a:any)=>n+a.prix_mensuel,0)),monthDue=entryMoney(amounts.loyer!+amounts.charges!+lotsTotal+regularisation.montant!),total=entryMoney(monthDue+solde+amounts.caution!)
 if(monthDue<0)return{ok:false as const,error:'La déduction dépasse le montant du mois.'}
 let occupantIds=[id];if(bailId){const{data:os,error}=await s.from('locataires').select('id').eq('bail_id',bailId).eq('proprietaire_id',ownerId);if(error)return{ok:false as const,error:'Impossible de vérifier les occupants du bail.'};if(os?.length)occupantIds=os.map((o:any)=>o.id)}
 return{ok:true as const,loc,bailId,mois,source,occupantIds,monthDue,total,solde,lotsTotal,...amounts,regularisation:regularisation.montant!,periode:regularisation.periode,prorata:prorata.detail?{...prorata.detail,manuel:amounts.loyer!==prorata.loyer||amounts.charges!==prorata.charges||amounts.annexes.some((a:any)=>a.prix_mensuel!==annexes.find(b=>b.lot_id===a.lot_id)?.prix_mensuel)}:null}
}
export const rentalEntrySchemaError=(message:string)=>/schema cache|column .*does not exist|could not find.*column/i.test(message)?'Exécutez la migration Supabase 20261026_saisie_paiements_quittances.sql avant d’enregistrer. Aucune modification n’a été enregistrée.':message
