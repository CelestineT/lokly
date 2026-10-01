'use server'
import {createClient} from '@/lib/supabase/server'
import {revalidatePath} from 'next/cache'

const num=(v:FormDataEntryValue|null)=>v!==null&&String(v).trim()!==''?Number(v):null
const str=(v:FormDataEntryValue|null)=>v!==null&&String(v).trim()!==''?String(v):null

export async function enregistrerFinancement(bienId:string,formData:FormData){
 const s=await createClient();const{data:{user}}=await s.auth.getUser();if(!user)return{error:'Vous devez être connecté.'}
 const montant=num(formData.get('montant_emprunte')),apport=num(formData.get('apport_personnel')),taux=num(formData.get('taux_nominal')),mensualite=num(formData.get('mensualite')),duree=num(formData.get('duree_mois')),assurance=num(formData.get('assurance_mensuelle')),dateDebut=str(formData.get('date_debut')),dateFin=str(formData.get('date_fin'))
 for(const[v,label]of[[montant,'Montant emprunté'],[apport,'Apport personnel'],[taux,'Taux nominal'],[mensualite,'Mensualité'],[duree,'Durée'],[assurance,'Assurance mensuelle']] as const){if(v!==null&&(!Number.isFinite(v)||v<0))return{error:`${label} : valeur invalide.`}}
 if(dateDebut&&dateFin&&dateFin<dateDebut)return{error:'La date de fin doit être postérieure à la date de début.'}
 const{error}=await s.from('financements').upsert({proprietaire_id:user.id,bien_id:bienId,montant_emprunte:montant,apport_personnel:apport,taux_nominal:taux,mensualite,duree_mois:duree===null?null:Math.round(duree),date_debut:dateDebut,date_fin:dateFin,assurance_mensuelle:assurance,updated_at:new Date().toISOString()},{onConflict:'bien_id'})
 if(error)return{error:error.message};revalidatePath(`/dashboard/biens/${bienId}`);revalidatePath(`/dashboard/biens/${bienId}/financement`);return{ok:true}
}

export async function supprimerFinancement(bienId:string){const s=await createClient();const{data:{user}}=await s.auth.getUser();if(!user)return{error:'Vous devez être connecté.'};const{error}=await s.from('financements').delete().eq('bien_id',bienId).eq('proprietaire_id',user.id);if(error)return{error:error.message};revalidatePath(`/dashboard/biens/${bienId}`);revalidatePath(`/dashboard/biens/${bienId}/financement`);return{ok:true}}
