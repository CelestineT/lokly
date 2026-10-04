'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const NON_HABITABLE = new Set(['parking','box','garage','cave','autre'])
type LotInput={id?:string;numero_lot:string;nom_personnalise?:string;type:string;specificite?:string;surface_m2:string;nb_pieces:string;type_location:string;dpe?:string;estimation_conso_basse?:string;estimation_conso_haute?:string;prix_mensuel?:string;annexes?:string[];rattachement_type?:string;parent_lot_id?:string|null;locataire_externe_nom?:string;locataire_externe_email?:string}
const optional=(v:FormDataEntryValue|null)=>v&&String(v).trim()?String(v):null
const isTemporaryLotId=(value?:string|null)=>Boolean(value?.startsWith('__new_'))

export async function modifierBien(id:string,formData:FormData){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return{error:'Vous devez être connecté.'}
 const type=String(formData.get('type')??''), immeuble=type==='immeuble'||type==='immeuble_rapport', surface=formData.get('surface_m2'), surfaceLocative=formData.get('surface_locative_m2'), pieces=formData.get('nb_pieces'), lotsCount=formData.get('nb_lots'), prix=formData.get('prix_achat'), consoBasse=formData.get('estimation_conso_basse'), consoHaute=formData.get('estimation_conso_haute'), annexes=formData.getAll('annexes') as string[], lotsJson=formData.get('lots_json') as string|null
 const basse=consoBasse&&String(consoBasse).trim()?Number(consoBasse):null,haute=consoHaute&&String(consoHaute).trim()?Number(consoHaute):null;if(basse!=null&&haute!=null&&haute<basse)return{error:'L’estimation haute doit être supérieure ou égale à l’estimation basse.'}
 const {error}=await supabase.from('biens').update({nom:String(formData.get('nom')??''),adresse:String(formData.get('adresse')??''),ville:String(formData.get('ville')??''),code_postal:String(formData.get('code_postal')??''),type,type_location:NON_HABITABLE.has(type)?null:((formData.get('type_location') as string)||null),specificite:(formData.get('specificite') as string)||null,parent_bien_id:(formData.get('parent_bien_id') as string)||null,rattachement_type:(formData.get('rattachement_type') as string)||null,locataire_externe_nom:(formData.get('locataire_externe_nom') as string)||null,locataire_externe_email:(formData.get('locataire_externe_email') as string)||null,surface_m2:!immeuble&&surface?Number(surface):null,surface_totale_m2:immeuble&&surface?Number(surface):null,surface_locative_m2:immeuble&&surfaceLocative?Number(surfaceLocative):null,nb_pieces:!immeuble&&pieces?Number(pieces):null,nb_lots:immeuble?Number(lotsCount||0):null,prix_achat:prix?Number(prix):null,annexes,date_acquisition:optional(formData.get('date_acquisition')),date_mise_location:optional(formData.get('date_mise_location')),date_construction:optional(formData.get('date_construction')),date_renovation:optional(formData.get('date_renovation')),dpe:optional(formData.get('dpe')),estimation_conso_annuelle_basse:basse,estimation_conso_annuelle_haute:haute}).eq('id',id).eq('proprietaire_id',user.id)
 if(error)return{error:error.message}
 if(immeuble&&lotsJson){let lots:LotInput[];try{lots=JSON.parse(lotsJson)}catch{return{error:'Le détail des lots est invalide.'}}
  for(const l of lots){const lb=l.estimation_conso_basse!==undefined&&l.estimation_conso_basse!==''?Number(l.estimation_conso_basse):null,lh=l.estimation_conso_haute!==undefined&&l.estimation_conso_haute!==''?Number(l.estimation_conso_haute):null;if(lb!=null&&lh!=null&&lh<lb)return{error:`${l.nom_personnalise?.trim()||l.numero_lot} : l’estimation haute doit être supérieure ou égale à l’estimation basse.`}}
  const {data:existing,error:readError}=await supabase.from('lots').select('id').eq('bien_id',id).eq('proprietaire_id',user.id);if(readError)return{error:readError.message}
  const keptIds=lots.map(l=>l.id).filter((lotId):lotId is string=>Boolean(lotId)&&!isTemporaryLotId(lotId));const removed=(existing??[]).map(x=>x.id).filter(x=>!keptIds.includes(x));
  if(removed.length){await supabase.from('lots').update({parent_lot_id:null}).eq('bien_id',id).in('parent_lot_id',removed);const{error:delError}=await supabase.from('lots').delete().eq('bien_id',id).eq('proprietaire_id',user.id).in('id',removed);if(delError)return{error:delError.message}}

  // Premier passage : enregistrer tous les lots sans envoyer d'identifiant temporaire dans parent_lot_id.
  // Les nouveaux lots reçoivent ici leur véritable UUID Supabase.
  const resolvedIds=new Map<string,string>()
  for(let i=0;i<lots.length;i++){
   const l=lots[i];const hab=['appartement','studio'].includes(l.type),ratt=['box','parking','garage','cave'].includes(l.type)
   const row={numero_lot:`Lot ${i+1}`,nom_personnalise:l.nom_personnalise?.trim()||null,type:l.type||'appartement',specificite:hab?(l.specificite||null):null,type_location:l.type_location||null,dpe:hab?(l.dpe||null):null,estimation_conso_annuelle_basse:hab&&l.estimation_conso_basse!==undefined&&l.estimation_conso_basse!==''?Number(l.estimation_conso_basse):null,estimation_conso_annuelle_haute:hab&&l.estimation_conso_haute!==undefined&&l.estimation_conso_haute!==''?Number(l.estimation_conso_haute):null,prix_mensuel:ratt&&l.prix_mensuel!==undefined&&l.prix_mensuel!==''?Number(l.prix_mensuel):null,surface_m2:l.surface_m2?Number(l.surface_m2):null,nb_pieces:l.nb_pieces?Number(l.nb_pieces):null,annexes:l.annexes??[],rattachement_type:l.rattachement_type||null,parent_lot_id:null,locataire_externe_nom:l.rattachement_type==='locataire_externe'?(l.locataire_externe_nom||null):null,locataire_externe_email:l.rattachement_type==='locataire_externe'?(l.locataire_externe_email||null):null}
   if(l.id&&!isTemporaryLotId(l.id)){
    const{error:e}=await supabase.from('lots').update(row).eq('id',l.id).eq('bien_id',id).eq('proprietaire_id',user.id);if(e)return{error:e.message};resolvedIds.set(l.id,l.id)
   }else{
    const{data:created,error:e}=await supabase.from('lots').insert({...row,bien_id:id,proprietaire_id:user.id}).select('id').single();if(e)return{error:e.message};if(!created)return{error:'Impossible de récupérer l’identifiant du nouveau lot.'};resolvedIds.set(l.id||`__new_${i}`,created.id);resolvedIds.set(`__new_${i}`,created.id)
   }
  }

  // Second passage : une fois tous les vrais UUID connus, appliquer les rattachements.
  for(let i=0;i<lots.length;i++){
   const l=lots[i];if(l.rattachement_type!=='lot')continue
   const childId=resolvedIds.get(l.id||`__new_${i}`)||(l.id&&!isTemporaryLotId(l.id)?l.id:null)
   const requestedParent=l.parent_lot_id||null
   const parentId=requestedParent?(resolvedIds.get(requestedParent)||(isTemporaryLotId(requestedParent)?null:requestedParent)):null
   if(!childId)return{error:`Impossible d’identifier ${l.nom_personnalise?.trim()||l.numero_lot}.`}
   if(requestedParent&&!parentId)return{error:`Impossible d’identifier le lot auquel rattacher ${l.nom_personnalise?.trim()||l.numero_lot}.`}
   const{error:e}=await supabase.from('lots').update({parent_lot_id:parentId}).eq('id',childId).eq('bien_id',id).eq('proprietaire_id',user.id);if(e)return{error:e.message}
  }
 }
 revalidatePath('/dashboard');revalidatePath('/dashboard/biens');revalidatePath(`/dashboard/biens/${id}`);return{ok:true}
}
