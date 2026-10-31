import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {deliveryConfig} from '@/lib/quittanceDelivery'
export async function GET(req:NextRequest){
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:'Non autorisé'},{status:401})
 const id=req.nextUrl.searchParams.get('id');if(!id)return NextResponse.json({error:'Document manquant'},{status:400})
 const{data:q,error}=await s.from('quittances').select('id,locataire_id').eq('id',id).eq('proprietaire_id',user.id).maybeSingle();if(error||!q)return NextResponse.json({error:'Document introuvable'},{status:404})
 const{data:t}=await s.from('locataires').select('email').eq('id',q.locataire_id).eq('proprietaire_id',user.id).maybeSingle()
 const{data:history,error:he}=await s.from('quittance_envois').select('id,mode,statut,cree_le,resend_id').eq('quittance_id',id).eq('proprietaire_id',user.id).order('cree_le',{ascending:false}).limit(5)
 let config;try{config=deliveryConfig(user.email??'',t?.email??'')}catch(e){return NextResponse.json({ready:false,message:(e as Error).message,history:history??[]})}
 return NextResponse.json({ready:!!process.env.RESEND_API_KEY&&!he,mode:config.production?'production':'test',to:config.to,message:he?'Journal à activer avec la migration des envois réels.':!process.env.RESEND_API_KEY?'Clé Resend à configurer.':'',history:history??[]},{headers:{'Cache-Control':'private, no-store'}})
}
export async function POST(req:NextRequest){try{
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:'Non autorisé'},{status:401})
 const{id}=await req.json();if(typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id))return NextResponse.json({error:'Envoi invalide'},{status:400})
 const{data:row}=await s.from('quittance_envois').select('*').eq('id',id).eq('proprietaire_id',user.id).maybeSingle();if(!row)return NextResponse.json({error:'Envoi introuvable'},{status:404})
 if(!row.resend_id)return NextResponse.json({status:row.statut,message:'Référence absente : vérifiez la console Resend. Aucun e-mail renvoyé.'})
 if(!process.env.RESEND_API_KEY)return NextResponse.json({error:'Configuration Resend indisponible'},{status:503})
 const rr=await fetch(`https://api.resend.com/emails/${encodeURIComponent(row.resend_id)}`,{headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`},signal:AbortSignal.timeout(10000),redirect:'error',cache:'no-store'});if(!rr.ok)return NextResponse.json({error:'Suivi Resend indisponible'},{status:502})
 const data=await rr.json();if(data.id!==row.resend_id)return NextResponse.json({error:'Référence de suivi incohérente'},{status:502})
 const status=['delivered','bounced','complained','failed'].includes(data.last_event)?data.last_event:row.statut
 const{data:saved,error}=await s.rpc('resultat_envoi_quittance',{p_id:id,p_statut:status,p_resend:row.resend_id});if(error||!saved)return NextResponse.json({error:'Suivi non enregistré'},{status:503})
 return NextResponse.json({status:saved.statut})
 }catch{return NextResponse.json({error:'Suivi indisponible. Aucun e-mail renvoyé.'},{status:503})}}
