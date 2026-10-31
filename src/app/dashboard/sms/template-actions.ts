'use server'
import {createClient} from '@/lib/supabase/server'
import {revalidatePath} from 'next/cache'
import {validateSmsTemplate} from '@/lib/smsOwnerTemplates'
export async function saveSmsTemplate(form:FormData){
 let v;try{v=validateSmsTemplate(form)}catch(e){return{error:(e as Error).message}}
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return{error:'Connectez-vous pour enregistrer un modèle.'}
 const payload={proprietaire_id:user.id,titre:v.title,contenu:v.body,usage:v.kind,origine:v.origin}
 const q=v.id?s.from('sms_modeles').update(payload).eq('id',v.id).eq('proprietaire_id',user.id):v.origin?s.from('sms_modeles').upsert(payload,{onConflict:'proprietaire_id,origine'}):s.from('sms_modeles').insert(payload)
 const{data,error}=await q.select('id,titre,contenu,usage,origine').single();if(error||!data)return{error:'Enregistrement impossible. Vérifiez l’activation des modèles SMS dans Supabase.'}
 revalidatePath('/dashboard/sms');return{template:{id:String(data.id),title:String(data.titre),body:String(data.contenu),kind:data.usage as 'group'|'individual',origin:data.origine as string|null}}
}
export async function deleteSmsTemplate(id:string){
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return{error:'Connectez-vous pour modifier vos modèles.'}
 const{data,error}=await s.from('sms_modeles').delete().eq('id',id).eq('proprietaire_id',user.id).select('id').maybeSingle();if(error||!data)return{error:'Ce modèle est introuvable ou inaccessible.'}
 revalidatePath('/dashboard/sms');return{ok:true}
}
