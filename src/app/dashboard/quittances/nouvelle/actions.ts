'use server'
import {parseChargeRegularisation} from '@/lib/chargeRegularisation'
import {rentAt,withRentAt} from '@/lib/rentHistory'
import {loadBailAnnexes} from '@/lib/loadBailAnnexes'
import {createClient} from '@/lib/supabase/server'
import {revalidatePath} from 'next/cache'
export async function creerQuittance(formData:FormData){
 const s=await createClient(),{data:{user},error:authError}=await s.auth.getUser();if(authError||!user)return{error:'Vous devez être connecté pour créer une quittance.'}
 const locataireId=String(formData.get('locataire_id')??''),mois=String(formData.get('mois')??''),commentaire=String(formData.get('commentaire')??'');if(!locataireId||!mois)return{error:'Le bail et le mois sont obligatoires.'}
 const regularisation=parseChargeRegularisation(formData.get('regularisation_charges'),formData.get('regularisation_periode'));if(regularisation.error)return{error:regularisation.error}
 const{data:loc,error:le}=await s.from('locataires').select('id,bien_id,bail_id,loyer_hc,charges').eq('id',locataireId).eq('proprietaire_id',user.id).single();if(le||!loc)return{error:'Locataire introuvable.'}
 let bailId=loc.bail_id as string|null,loyer=Number(loc.loyer_hc??0),charges=Number(loc.charges??0)
 if(bailId){const{data:b}=await s.from('baux').select('*').eq('id',bailId).eq('proprietaire_id',user.id).single();if(b){const rent=rentAt(b,mois);loyer=rent.loyer_hc;charges=rent.charges}else return{error:'Impossible de charger les montants du bail.'}}
 const[y,m]=mois.split('-').map(Number);if(!y||!m)return{error:'Période de quittance invalide.'};const debut=`${mois}-01`,fin=`${mois}-${String(new Date(y,m,0).getDate()).padStart(2,'0')}`
 let detail:Array<{lot_id:string;numero_lot:string;nom_personnalise?:string;type:string;prix_mensuel:number}>=[]
 if(bailId){try{const result=await loadBailAnnexes(s,bailId,loc.bien_id,mois,user.id);detail=result.rows.map(x=>({lot_id:x.lot_id,numero_lot:x.numero_lot,nom_personnalise:x.nom_personnalise,type:x.type,prix_mensuel:x.prix_mensuel}))}catch(e){return{error:e instanceof Error?e.message:'Impossible de vérifier les lots rattachés.'}}}

 const lotsTotal=detail.reduce((n,l)=>n+l.prix_mensuel,0),solde=Number(formData.get('solde')??0)||0,totalMois=Math.round((loyer+charges+lotsTotal+regularisation.montant!)*100)/100,totalAffiche=Math.round((totalMois+solde)*100)/100
 if(totalMois<0)return{error:'La déduction dépasse le montant du mois. Répartissez-la sur plusieurs échéances.'}
 // Le solde antérieur est informatif : il apparaît sur la quittance mais ne bloque pas l'édition du mois courant.
 let occupantIds=[loc.id];if(bailId){const{data:os}=await s.from('locataires').select('id').eq('bail_id',bailId).eq('proprietaire_id',user.id);if(os?.length)occupantIds=os.map(o=>o.id)}
 const{data:p,error:pe}=await s.from('paiements').select('montant,statut').eq('proprietaire_id',user.id).in('locataire_id',occupantIds).eq('mois',mois).in('statut',['recu','partiel']);if(pe)return{error:`Impossible de vérifier le paiement : ${pe.message}`};const encaisse=(p??[]).reduce((n,x)=>n+Number(x.montant??0),0);if(encaisse+.001<totalMois){const reste=totalMois-encaisse;return{error:`Quittance indisponible : ${encaisse.toLocaleString('fr-FR',{minimumFractionDigits:2})} € encaissés sur ${totalMois.toLocaleString('fr-FR',{minimumFractionDigits:2})} €. Il reste ${reste.toLocaleString('fr-FR',{minimumFractionDigits:2})} € à régler.`,code:'PAYMENT_REQUIRED' as const,locataireId:loc.id,bailId,mois,montantAttendu:totalMois,montantEncaisse:encaisse}}
 if(bailId){const{data:occupants}=await s.from('locataires').select('id').eq('bail_id',bailId).eq('proprietaire_id',user.id);const ids=(occupants??[]).map(o=>o.id);if(ids.length){const{data:exist}=await s.from('quittances').select('id').eq('proprietaire_id',user.id).eq('mois',mois).in('locataire_id',ids).limit(1);if(exist?.length)return{error:'Une quittance existe déjà pour ce bail et cette période.'}}}else{const{data:exist}=await s.from('quittances').select('id').eq('proprietaire_id',user.id).eq('locataire_id',locataireId).eq('mois',mois).maybeSingle();if(exist)return{error:'Une quittance existe déjà pour ce locataire et cette période.'}}
 const{error}=await s.from('quittances').insert({proprietaire_id:user.id,locataire_id:locataireId,bien_id:loc.bien_id??null,mois,loyer_hc:loyer,charges,lots_annexes_total:lotsTotal,lots_annexes_detail:detail,...(regularisation.montant!==0?{regularisation_charges:regularisation.montant,regularisation_periode:regularisation.periode}:{}),solde,total:totalAffiche,envoyee:false,caution_affichee:formData.get('caution_affichee')==='on',date_signature:String(formData.get('date_signature')??''),commentaire:commentaire||null});if(error)return{error:/regularisation_(charges|periode)/i.test(error.message)?'La régularisation nécessite la mise à jour Supabase : exécutez la migration 20261025_regularisation_charges.sql. Aucune quittance n’a été créée.':error.message}
 revalidatePath('/dashboard/quittances');revalidatePath('/dashboard/paiements');revalidatePath('/dashboard');revalidatePath('/dashboard/rentabilite');return{ok:true}
}
