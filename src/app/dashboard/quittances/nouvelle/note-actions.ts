'use server'
import {createClient} from '@/lib/supabase/server'
import {schemaMessage} from '@/lib/paymentAmounts'
import {revalidatePath} from 'next/cache'
export async function enregistrerNoteInterne(locataireId:string,note:string){
 if(!locataireId||typeof note!=='string'||note.length>2000)return{error:'Note invalide (2 000 caractères maximum).'};
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return{error:'Vous devez être connecté.'};
 const{data,error}=await s.from('locataires').update({qualite_interne:note.trim()||null}).eq('id',locataireId).eq('proprietaire_id',user.id).select('id').single();
 if(error||!data)return{error:schemaMessage(error?.message||'Locataire introuvable.')};revalidatePath('/dashboard/quittances/nouvelle');revalidatePath('/dashboard/locataires');return{ok:true}
}
