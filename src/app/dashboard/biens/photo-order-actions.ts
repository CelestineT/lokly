'use server'
import {createClient} from '@/lib/supabase/server'
import {revalidatePath} from 'next/cache'
export async function loadPhotoOrder(id:string){
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return{error:'Connexion nécessaire.'}
 const{data:bien}=await s.from('biens').select('id').eq('id',id).eq('proprietaire_id',user.id).maybeSingle();if(!bien)return{error:'Bien introuvable.'}
 const{data:profile,error}=await s.from('profiles').select('ordre_affichage').eq('id',user.id).maybeSingle();if(error)return{error:'Impossible de lire l’ordre des photos.'}
 const ids=profile?.ordre_affichage?.[`photos:${id}`];return{ids:Array.isArray(ids)?ids.filter((x:unknown)=>typeof x==='string'):[]}
}
export async function savePhotoOrder(id:string,ids:string[]){
 if(!Array.isArray(ids)||ids.length>1000||new Set(ids).size!==ids.length||ids.some(p=>typeof p!=='string'||p.length>200))return{error:'Classement invalide.'}
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return{error:'Connexion nécessaire.'}
 const{data:bien}=await s.from('biens').select('id').eq('id',id).eq('proprietaire_id',user.id).maybeSingle();if(!bien)return{error:'Bien introuvable ou accès non autorisé.'}
 const prefix=`${user.id}/biens/${id}/`;if(ids.some(p=>!p.startsWith(prefix)||p.slice(prefix.length).includes('/')||!(p.slice(prefix.length)==='photo'||p.slice(prefix.length).startsWith('photo-'))))return{error:'Une photo ne correspond pas à ce bien.'}
 const{data:profile,error}=await s.from('profiles').select('ordre_affichage').eq('id',user.id).maybeSingle();if(error||!profile||!profile.ordre_affichage)return{error:'Impossible de lire le classement du profil.'}
 const previous=profile.ordre_affichage
 const{data:saved,error:writeError}=await s.from('profiles').update({ordre_affichage:{...previous,[`photos:${id}`]:ids}}).eq('id',user.id).eq('ordre_affichage',JSON.stringify(previous)).select('id').maybeSingle()
 if(writeError||!saved)return{error:'Classement non enregistré. Actualisez les photos et réessayez.'}
 revalidatePath('/dashboard/biens');revalidatePath(`/dashboard/biens/${id}`);return{ok:true}
}
