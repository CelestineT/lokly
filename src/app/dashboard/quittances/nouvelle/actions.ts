'use server'
import {createClient} from '@/lib/supabase/server'
import {validCalendarDate} from '@/lib/receiptBilling'
import {resolveRentalEntry,rentalEntrySchemaError} from '@/lib/resolveRentalEntry'
import {revalidatePath} from 'next/cache'
export async function creerQuittance(fd:FormData){return enregistrerQuittance(fd)}
export async function modifierQuittance(id:string,fd:FormData){if(!id)return{error:'Quittance manquante.'};return enregistrerQuittance(fd,id)}
async function enregistrerQuittance(fd:FormData,id?:string){
 const s=await createClient(),{data:{user},error:authError}=await s.auth.getUser();if(authError||!user)return{error:'Vous devez être connecté.'}
 if(id){const{data:old,error}=await s.from('quittances').select('id').eq('id',id).eq('proprietaire_id',user.id).single();if(error||!old)return{error:'Quittance introuvable ou accès non autorisé.'}}
 const signature=validCalendarDate(fd.get('date_signature'));if(!signature)return{error:'Choisissez une date de signature valide.'}
 const r=await resolveRentalEntry(s,user.id,fd);if(!r.ok)return{error:r.error}
 const{data:p,error:pe}=await s.from('paiements').select('*').eq('proprietaire_id',user.id).in('locataire_id',r.occupantIds!).eq('mois',r.mois).in('statut',['recu','partiel']);if(pe)return{error:'Impossible de vérifier les paiements.'}
 const encaisse=(p??[]).reduce((n:number,x:any)=>n+Number(x.montant??0),0);if(encaisse+.001<r.monthDue!)return{error:`Quittance indisponible : ${encaisse.toLocaleString('fr-FR')} € encaissés sur ${r.monthDue!.toLocaleString('fr-FR')} €.`,code:'PAYMENT_REQUIRED' as const,locataireId:r.loc.id,bailId:r.bailId,mois:r.mois,montantAttendu:r.monthDue!,montantEncaisse:encaisse}
 let duplicate=s.from('quittances').select('id').eq('proprietaire_id',user.id).eq('mois',r.mois).in('locataire_id',r.occupantIds!);if(id)duplicate=duplicate.neq('id',id)
 const{data:existing,error:de}=await duplicate.limit(1);if(de)return{error:'Impossible de vérifier les doublons.'};if(existing?.length)return{error:'Une quittance existe déjà pour ce bail et ce mois.'}
 const payload={proprietaire_id:user.id,locataire_id:r.loc.id,bien_id:r.loc.bien_id,mois:r.mois,loyer_hc:r.loyer,charges:r.charges,lots_annexes_total:r.lotsTotal,lots_annexes_detail:r.annexes,regularisation_charges:r.regularisation,regularisation_periode:r.periode,solde:r.solde,total:r.total,caution_affichee:r.cautionAffichee,caution_montant:r.caution,caution_encaissee:r.cautionEncaissee,caution_total_inclus:true,prorata_detail:r.prorata,date_signature:signature,commentaire:String(fd.get('commentaire')??'')||null,envoyee:false}
 const query=id?s.from('quittances').update(payload).eq('id',id).eq('proprietaire_id',user.id):s.from('quittances').insert(payload)
 const{data:saved,error}=await query.select('id').single();if(error||!saved)return{error:rentalEntrySchemaError(error?.message??'La quittance n’a pas été enregistrée.')}
 revalidatePath('/dashboard','layout');return{ok:true,id:saved.id}
}
