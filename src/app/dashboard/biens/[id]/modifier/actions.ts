'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
const NON_HABITABLE=new Set(['parking','box','garage','cave','autre'])
export async function modifierBien(id:string,formData:FormData){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return{error:'Vous devez être connecté.'}
 const type=String(formData.get('type')??''), immeuble=type==='immeuble'||type==='immeuble_rapport', surface=formData.get('surface_m2'), pieces=formData.get('nb_pieces'), lots=formData.get('nb_lots'), prix=formData.get('prix_achat'), annexes=formData.getAll('annexes') as string[]
 const {error}=await supabase.from('biens').update({nom:String(formData.get('nom')??''),adresse:String(formData.get('adresse')??''),ville:String(formData.get('ville')??''),code_postal:String(formData.get('code_postal')??''),type,type_location:NON_HABITABLE.has(type)?null:((formData.get('type_location') as string)||null),specificite:(formData.get('specificite') as string)||null,parent_bien_id:(formData.get('parent_bien_id') as string)||null,rattachement_type:(formData.get('rattachement_type') as string)||null,locataire_externe_nom:(formData.get('locataire_externe_nom') as string)||null,locataire_externe_email:(formData.get('locataire_externe_email') as string)||null,surface_m2:!immeuble&&surface?Number(surface):null,surface_totale_m2:immeuble&&surface?Number(surface):null,nb_pieces:!immeuble&&pieces?Number(pieces):null,nb_lots:immeuble&&lots?Number(lots):null,prix_achat:prix?Number(prix):null,annexes}).eq('id',id).eq('proprietaire_id',user.id)
 if(error)return{error:error.message}; revalidatePath('/dashboard');revalidatePath('/dashboard/biens');revalidatePath(`/dashboard/biens/${id}`);return{ok:true}
}
