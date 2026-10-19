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

export async function corrigerMontant(bailId:string,form:FormData){
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return {error:'Vous devez être connecté.'}
 const date=String(form.get('date_effet')??''),loyer=String(form.get('loyer_hc')??''),charges=String(form.get('charges')??''),motif=String(form.get('motif')??'').trim()
 if((date&&!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(date))||!loyer.trim()||!charges.trim()||![Number(loyer),Number(charges)].every(n=>Number.isFinite(n)&&n>=0&&Math.abs(n*100-Math.round(n*100))<1e-6)||!motif||motif.length>500)return {error:'Vérifiez les montants et renseignez un motif de correction.'}
 let attendu:any;try{attendu=JSON.parse(String(form.get('attendu')??''))}catch{return {error:'Actualisez la fiche avant de corriger le montant.'}}
 if(!attendu||![attendu.loyer_hc,attendu.charges].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0)||!Array.isArray(attendu.historique_loyers))return {error:'Actualisez la fiche avant de corriger le montant.'}
 const {data,error}=await s.rpc('corriger_montant_loyer',{p_bail_id:bailId,p_date_effet:date||null,p_loyer_hc:Number(loyer),p_charges:Number(charges),p_motif:motif,p_attendu:attendu})
 if(error)return {error:error.code==='PGRST202'?'La mise à jour SQL des corrections de loyer doit être exécutée avant de pouvoir corriger ce montant.':error.message}
 if(!data||typeof data!=='object')return {error:'La correction n’a pas pu être confirmée. Actualisez la fiche.'}
 revalidatePath('/dashboard','layout');return {ok:true,source:data}
}
