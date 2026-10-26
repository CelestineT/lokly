'use server'
import {createClient} from '@/lib/supabase/server'
import {revalidatePath} from 'next/cache'

/** Delete the attachment, including its previous versions, never the lot itself. */
export async function supprimerRattachementAnnexe(bailId:string,lotId:string){
 if(!bailId||!lotId)return{error:'Le bail et le lot sont obligatoires.'}
 const s=await createClient(),{data:{user},error:authError}=await s.auth.getUser()
 if(authError||!user)return{error:'Vous devez être connecté pour supprimer ce rattachement.'}
 const{data:bail,error:bailError}=await s.from('baux').select('id').eq('id',bailId).eq('proprietaire_id',user.id).maybeSingle()
 if(bailError||!bail)return{error:'Bail introuvable ou accès non autorisé.'}
 // All versions of this lot on this lease must go: deleting only the newest
 // closed version would make an older open version billable again.
 const{data:deleted,error}=await s.from('affectations_lots_baux').delete().eq('bail_id',bailId).eq('lot_id',lotId).eq('proprietaire_id',user.id).select('id')
 if(error)return{error:`Suppression impossible : ${error.message}`}
 if(!deleted?.length)return{error:'Aucun rattachement supprimé. Rechargez la fiche pour vérifier son état.'}
 revalidatePath('/dashboard','layout')
 return{ok:true}
}
