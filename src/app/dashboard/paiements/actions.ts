'use server'
import {createClient} from '@/lib/supabase/server'
import {readReceiptAmount,validCalendarDate} from '@/lib/receiptBilling'
import {resolveRentalEntry,rentalEntrySchemaError} from '@/lib/resolveRentalEntry'
import {paymentAmounts} from '@/lib/paymentAmounts'
import {revalidatePath} from 'next/cache'
export async function enregistrerPaiement(fd:FormData,id?:string){
 const s=await createClient(),{data:{user},error:ae}=await s.auth.getUser();if(ae||!user)return{error:'Vous devez être connecté.'}
 if(id){const{data:old,error}=await s.from('paiements').select('id').eq('id',id).eq('proprietaire_id',user.id).single();if(error||!old)return{error:'Paiement introuvable ou accès non autorisé.'}}
 const received=readReceiptAmount(fd.get('montant')),date=validCalendarDate(fd.get('date_paiement')),mode=String(fd.get('mode_paiement')??'virement');if(received===null||!date||!['virement','prelevement','cheque','especes'].includes(mode))return{error:'Vérifiez le montant reçu, la date et le mode de paiement.'}
 const r=await resolveRentalEntry(s,user.id,fd);if(!r.ok)return{error:r.error}
 const detail={loyer_hc:r.loyer,charges:r.charges,lots_annexes_detail:r.annexes,lots_annexes_total:r.lotsTotal,regularisation_charges:r.regularisation,regularisation_periode:r.periode,caution_affichee:r.cautionAffichee,caution_montant:r.caution,caution_encaissee:r.cautionEncaissee,prorata_detail:r.prorata,total:r.total}
 const payload={proprietaire_id:user.id,locataire_id:r.loc.id,bien_id:r.loc.bien_id,mois:r.mois,montant:received,caution_recue:r.cautionEncaissee,detail_echeance:detail,date_paiement:date,mode_paiement:mode,statut:paymentAmounts(r.monthDue!+r.caution!,received+r.cautionEncaissee!,r.solde).status,solde_anterieur:r.solde,commentaire:String(fd.get('commentaire')??'')||null}
 const query=id?s.from('paiements').update(payload).eq('id',id).eq('proprietaire_id',user.id):s.from('paiements').insert(payload)
 const{data:saved,error}=await query.select('id').single();if(error||!saved)return{error:rentalEntrySchemaError(error?.message??'Le paiement n’a pas été enregistré.')}
 revalidatePath('/dashboard','layout');return{ok:true,id:saved.id}
}
