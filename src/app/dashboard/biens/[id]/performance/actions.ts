'use server'
import {createClient} from '@/lib/supabase/server'
import {revalidatePath} from 'next/cache'

export async function enregistrerValeurActuelle(bienId:string,formData:FormData){
 const s=await createClient();
 const{data:{user}}=await s.auth.getUser();
 if(!user)return{error:'Vous devez être connecté.'};
 const raw=String(formData.get('valeur_actuelle')??'').trim();
 const date=String(formData.get('valeur_actuelle_date')??'').trim();
 if(!raw)return{error:'Renseignez la valeur actuelle du bien.'};
 const valeur=Number(raw);
 if(!Number.isFinite(valeur)||valeur<=0)return{error:'La valeur actuelle doit être supérieure à 0.'};
 if(!date)return{error:"Renseignez la date d'estimation."};
 const{error}=await s.from('biens').update({valeur_actuelle:valeur,valeur_actuelle_date:date}).eq('id',bienId).eq('proprietaire_id',user.id);
 if(error)return{error:error.message};
 revalidatePath('/dashboard');revalidatePath('/dashboard/biens');revalidatePath(`/dashboard/biens/${bienId}`);revalidatePath('/dashboard/rentabilite');
 return{ok:true};
}
