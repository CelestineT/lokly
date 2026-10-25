import {uniqueAnnexes,annexesForMonth,annexeMonthBounds} from './annexeRows'
import {readAllRows} from './readAllRows'
export type BilledAnnexe={id:string;lot_id:string;bail_id:string;date_debut:string;date_fin:string|null;numero_lot:string;nom_personnalise:string;type:string;prix_mensuel:number}
export type AnnexeLoad={rows:BilledAnnexe[];history:BilledAnnexe[]}
export async function loadBailAnnexes(client:any,bailId:string,bienId:string,month:string,ownerId?:string):Promise<AnnexeLoad>{
 const bounds=annexeMonthBounds(month);if(!bounds)throw Error('Choisissez un mois valide.');if(!bailId)return{rows:[],history:[]}
 let query=client.from('affectations_lots_baux').select('id,bail_id,lot_id,date_debut,date_fin,prix_mensuel,lots(numero_lot,nom_personnalise,type,bien_id)').eq('bail_id',bailId).lte('date_debut',bounds.end);if(ownerId)query=query.eq('proprietaire_id',ownerId)
 const{data}=await readAllRows(query);const history=uniqueAnnexes((data??[]).map((a:any)=>{const lot=Array.isArray(a.lots)?a.lots[0]:a.lots;if(a.bail_id!==bailId||!lot||lot.bien_id!==bienId)throw Error('Un rattachement annexe est incohérent avec ce bail ou ce bien. Vérifiez la fiche locataire avant d’enregistrer.');const price=Number(a.prix_mensuel);if(!Number.isFinite(price)||price<0)throw Error('Le prix d’une annexe est invalide. Vérifiez son rattachement.');return{id:a.id,lot_id:a.lot_id,bail_id:a.bail_id,date_debut:a.date_debut,date_fin:a.date_fin??null,numero_lot:lot.numero_lot??'',nom_personnalise:lot.nom_personnalise?.trim()??'',type:lot.type??'lot',prix_mensuel:price} as BilledAnnexe}).filter((a:BilledAnnexe)=>a.date_debut<=bounds.end))
 return{rows:annexesForMonth(history,month),history}
}
