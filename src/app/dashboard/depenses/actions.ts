'use server'
import {expenseDates} from '@/lib/expenseSchedule'
import {createClient} from '@/lib/supabase/server'
import {revalidatePath} from 'next/cache'
import {expenseCategoryFromForm} from '@/lib/expenseCategories'
function refresh(){revalidatePath('/dashboard','layout')}
export async function modifierDepense(id:string,form:FormData){
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return{error:'Vous devez être connecté.'}
 let schedule:string[]|null=null;try{if(form.get('appliquer_calendrier')==='on'&&form.get('recurrente')==='on')schedule=expenseDates(form)}catch(e){return{error:(e as Error).message}}
 let anchor:string|undefined;
 if(schedule){const original=await s.from('depenses').select('id,date_depense').eq('id',id).eq('proprietaire_id',user.id).maybeSingle();if(original.error||!original.data)return{error:'Cette dépense est introuvable ou inaccessible.'};if(schedule.includes(original.data.date_depense))anchor=original.data.date_depense}
 const montant=String(form.get('montant')??''),date=anchor??schedule?.[0]??String(form.get('date_depense')??''),categorieBrute=String(form.get('categorie')??''),bien=String(form.get('bien_id')??'')||null,recurrente=form.get('recurrente')==='on',periodicite=recurrente?String(form.get('periodicite')??''):null,typeTravaux=categorieBrute==='travaux'?String(form.get('type_travaux')??'').trim():null
 let categorie:string;try{categorie=expenseCategoryFromForm(form)}catch(e){return{error:(e as Error).message}}
 const parsed=new Date(`${date}T12:00:00Z`)
 if(!montant.trim()||!Number.isFinite(Number(montant))||Number(montant)<0||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)return{error:'Vérifiez le montant, la date et la catégorie.'}
 if(recurrente&&!['mensuelle','trimestrielle','semestrielle','annuelle'].includes(periodicite??''))return{error:'Choisissez la périodicité.'}
 if(categorie==='travaux'&&(!typeTravaux||typeTravaux.trim()==='Autre'||typeTravaux.length>120))return{error:'Choisissez le type de travaux.'}
 if(bien){const{data,error}=await s.from('biens').select('id').eq('id',bien).eq('proprietaire_id',user.id).maybeSingle();if(error||!data)return{error:'Ce bien est introuvable ou inaccessible.'}}
 let existingRows:any[]=[];
 if(schedule){const existing=await s.from('depenses').select('id,bien_id,categorie,montant,date_depense,description,periodicite,type_travaux,deductible_fiscalement').eq('proprietaire_id',user.id).gte('date_depense',`${schedule[0].slice(0,4)}-01-01`).lte('date_depense',`${schedule[0].slice(0,4)}-12-31`);if(existing.error)return{error:'Impossible de vérifier les échéances déjà présentes.'};existingRows=existing.data??[]}
 const matches=(row:any)=>row.id!==id&&row.bien_id===bien&&row.categorie===categorie&&Number(row.montant)===Number(montant)&&(row.description??null)===(String(form.get('description')??'').trim()||null)&&row.periodicite===periodicite&&(row.type_travaux??null)===typeTravaux&&!!row.deductible_fiscalement===(form.get('deductible_fiscalement')==='on');
 const anchorDate=schedule?(anchor??schedule.find(d=>!existingRows.some(row=>matches(row)&&row.date_depense===d))):date;
 if(!anchorDate)return{error:'Ce calendrier est déjà couvert par des dépenses identiques. Modifiez cette échéance seule pour éviter un doublon.'};
 const values={bien_id:bien,categorie,montant:Number(montant),date_depense:anchorDate,description:String(form.get('description')??'').trim()||null,recurrente,periodicite,type_travaux:typeTravaux,deductible_fiscalement:form.get('deductible_fiscalement')==='on'}
 const{data,error}=await s.from('depenses').update(values).eq('id',id).eq('proprietaire_id',user.id).select('id').maybeSingle()
 if(error)return{error:error.message};if(!data)return{error:'Cette dépense est introuvable ou inaccessible.'};if(schedule){
 const remaining=schedule.filter(date=>date!==anchorDate&&!existingRows.some(row=>matches(row)&&row.date_depense===date))
 if(remaining.length){const result=await s.from('depenses').insert(remaining.map(date=>({...values,date_depense:date,proprietaire_id:user.id})));if(result.error){refresh();return{error:'La première échéance est enregistrée, mais les échéances supplémentaires n’ont pas pu être ajoutées. Réessayez la modification.'}}}
 }
 refresh();return{ok:true,id}
}
export async function supprimerDepense(id:string){
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return{error:'Vous devez être connecté.'}
 const{data,error}=await s.from('depenses').delete().eq('id',id).eq('proprietaire_id',user.id).select('id').maybeSingle()
 if(error)return{error:error.message};if(!data)return{error:'Cette dépense est introuvable ou déjà supprimée.'};refresh();return{ok:true}
}
