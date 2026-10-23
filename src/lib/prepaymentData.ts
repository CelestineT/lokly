import {createClient} from '@/lib/supabase/server'
import {notFound,redirect} from 'next/navigation'
import type {SimulatorLoan} from './prepaymentSeed'
export async function loadSimulatorLoan(id:string):Promise<SimulatorLoan>{
 const s=await createClient(),{data:{user},error:authError}=await s.auth.getUser();if(authError||!user)redirect('/login')
 const{data:loan,error}=await s.from('financements').select('*, biens(nom,ville)').eq('id',id).eq('proprietaire_id',user.id).maybeSingle()
 if(error)throw Error('Impossible de charger ce crédit. Actualisez la page pour réessayer.')
 if(!loan)notFound()
 const bien=Array.isArray(loan.biens)?loan.biens[0]:loan.biens
 const numeric=(v:unknown)=>v==null?null:Number(v)
 return{id:loan.id,bien_id:loan.bien_id,nom:bien?.nom??'Crédit immobilier',ville:bien?.ville??'',montant_emprunte:numeric(loan.montant_emprunte),taux_nominal:numeric(loan.taux_nominal),mensualite:numeric(loan.mensualite),assurance_mensuelle:numeric(loan.assurance_mensuelle),date_debut:loan.date_debut,date_fin:loan.date_fin,duree_mois:numeric(loan.duree_mois),differe_type:loan.differe_type,differe_debut:loan.differe_debut,differe_fin:loan.differe_fin,differe_mensualite:numeric(loan.differe_mensualite)}
}
