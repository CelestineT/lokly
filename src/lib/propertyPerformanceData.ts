import {createClient} from '@/lib/supabase/server'
import {redirect} from 'next/navigation'
import type {PerformanceData} from './propertyPerformance'
export async function loadPropertyPerformanceData(id?:string):Promise<PerformanceData>{
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)redirect('/login')
 const owned=(table:string)=>{let query=s.from(table).select('*').eq('proprietaire_id',user.id);if(id&&!['paiements','locataires'].includes(table))query=table==='biens'?query.eq('id',id):query.eq('bien_id',id);return query}
 async function read(table:string){const rows:any[]=[];for(let offset=0;;offset+=1000){const{data,error}=await owned(table).order('id').range(offset,offset+999);if(error)throw new Error('Impossible de charger les données de rentabilité. Réessayez.');rows.push(...(data??[]));if(!data||data.length<1000)return rows}}
 const [biens,lots,baux,paiements,depenses,financements,locataires]=await Promise.all(['biens','lots','baux','paiements','depenses','financements','locataires'].map(read))
 return {biens,lots,baux,paiements,depenses,financements,locataires} as PerformanceData
}
