import {createClient} from '@/lib/supabase/server'
import {notFound} from 'next/navigation'
import NouveauLotForm from './NouveauLotForm'
export default async function NouveauLotPage({params}:{params:Promise<{id:string}>}){const{id}=await params,s=await createClient();const{data:{user}}=await s.auth.getUser();if(!user)notFound();const{data:bien}=await s.from('biens').select('id,nom,type').eq('id',id).eq('proprietaire_id',user.id).single();if(!bien||!['immeuble','immeuble_rapport'].includes(bien.type))notFound();return <NouveauLotForm bienId={id} bienNom={bien.nom}/>}
