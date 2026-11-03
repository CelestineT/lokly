import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {verifySentArchive} from '@/lib/hostingerArchive'
export const runtime='nodejs'
export const maxDuration=60
export async function POST(){const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:'Connexion nécessaire.'},{status:401});const{data:p}=await s.from('profiles').select('email').eq('id',user.id).maybeSingle();try{await verifySentArchive(p?.email||user.email||'');return NextResponse.json({ok:true,message:'Connexion Hostinger et dossier Éléments envoyés vérifiés. Aucun e-mail envoyé.'},{headers:{'Cache-Control':'private, no-store'}})}catch(e){return NextResponse.json({error:(e as Error).message},{status:503})}}
