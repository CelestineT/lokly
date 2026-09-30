'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
export async function supprimerBien(id:string){const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)return{error:'Vous devez être connecté.'};const{error:lotsError}=await supabase.from('lots').delete().eq('bien_id',id).eq('proprietaire_id',user.id);if(lotsError)return{error:`Impossible de supprimer les lots associés : ${lotsError.message}`};const{error}=await supabase.from('biens').delete().eq('id',id).eq('proprietaire_id',user.id);if(error)return{error:`Impossible de supprimer ce bien : ${error.message}`};revalidatePath('/dashboard');revalidatePath('/dashboard/biens');return{ok:true}}
