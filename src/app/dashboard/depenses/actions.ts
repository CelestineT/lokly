'use server'
import {createClient} from '@/lib/supabase/server'
import {revalidatePath} from 'next/cache'
import {expenseCategoryFromForm} from '@/lib/expenseCategories'
function refresh(){revalidatePath('/dashboard','layout')}
export async function modifierDepense(id:string,form:FormData){
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return{error:'Vous devez être connecté.'}
 const montant=String(form.get('montant')??''),date=String(form.get('date_depense')??''),categorieBrute=String(form.get('categorie')??''),bien=String(form.get('bien_id')??'')||null,recurrente=form.get('recurrente')==='on',periodicite=recurrente?String(form.get('periodicite')??''):null,typeTravaux=categorieBrute==='travaux'?String(form.get('type_travaux')??'').trim():null
 let categorie:string;try{categorie=expenseCategoryFromForm(form)}catch(e){return{error:(e as Error).message}}
 const parsed=new Date(`${date}T12:00:00Z`)
 if(!montant.trim()||!Number.isFinite(Number(montant))||Number(montant)<0||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)return{error:'Vérifiez le montant, la date et la catégorie.'}
 if(recurrente&&!['mensuelle','trimestrielle','semestrielle','annuelle'].includes(periodicite??''))return{error:'Choisissez la périodicité.'}
 if(categorie==='travaux'&&(!typeTravaux||typeTravaux.trim()==='Autre'||typeTravaux.length>120))return{error:'Choisissez le type de travaux.'}
 if(bien){const{data,error}=await s.from('biens').select('id').eq('id',bien).eq('proprietaire_id',user.id).maybeSingle();if(error||!data)return{error:'Ce bien est introuvable ou inaccessible.'}}
 const{data,error}=await s.from('depenses').update({bien_id:bien,categorie,montant:Number(montant),date_depense:date,description:String(form.get('description')??'').trim()||null,recurrente,periodicite,type_travaux:typeTravaux,deductible_fiscalement:form.get('deductible_fiscalement')==='on'}).eq('id',id).eq('proprietaire_id',user.id).select('id').maybeSingle()
 if(error)return{error:error.message};if(!data)return{error:'Cette dépense est introuvable ou inaccessible.'};refresh();return{ok:true}
}
export async function supprimerDepense(id:string){
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return{error:'Vous devez être connecté.'}
 const{data,error}=await s.from('depenses').delete().eq('id',id).eq('proprietaire_id',user.id).select('id').maybeSingle()
 if(error)return{error:error.message};if(!data)return{error:'Cette dépense est introuvable ou déjà supprimée.'};refresh();return{ok:true}
}
