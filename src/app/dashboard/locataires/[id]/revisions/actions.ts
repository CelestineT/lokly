'use server'
import {createClient} from '@/lib/supabase/server'
import {revalidatePath} from 'next/cache'
export async function ajouterRevision(bailId:string,form:FormData){
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return {error:'Vous devez être connecté.'}
 const mois=String(form.get('mois')??''),loyer=String(form.get('loyer_hc')??''),charges=String(form.get('charges')??'')
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(mois)||!loyer.trim()||!charges.trim()||![Number(loyer),Number(charges)].every(n=>Number.isFinite(n)&&n>=0))return {error:'Vérifiez le mois et les montants de la révision.'}
 const {data,error}=await s.rpc('ajouter_revision_loyer',{p_bail_id:bailId,p_date_effet:`${mois}-01`,p_loyer_hc:Number(loyer),p_charges:Number(charges),p_motif:String(form.get('motif')??'').trim()})
 if(error)return {error:error.code==='PGRST202'?'La mise à jour SQL des révisions de loyer doit être exécutée avant de pouvoir enregistrer une révision.':error.message}
 revalidatePath('/dashboard','layout');return {ok:true,historique:data}
}
