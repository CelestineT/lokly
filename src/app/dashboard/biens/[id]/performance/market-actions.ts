'use server'
import {createClient} from '@/lib/supabase/server'
import {fetchMarketEstimate} from '@/lib/marketValuation'
import {rentalDate} from '@/lib/rentalTotals'
export async function estimerValeurMarche(bienId:string){
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return{error:'Vous devez être connecté.'}
 const{data,error}=await s.from('biens').select('type,adresse,ville,code_postal,surface_m2,surface_totale_m2').eq('id',bienId).eq('proprietaire_id',user.id).maybeSingle()
 if(error||!data)return{error:'Bien introuvable ou inaccessible.'}
 try{return{estimate:await fetchMarketEstimate(data,rentalDate())}}catch(e){return{error:e instanceof Error?e.message:'Estimation indisponible.'}}
}
