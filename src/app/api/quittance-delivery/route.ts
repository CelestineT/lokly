import {archiveApplies} from '@/lib/hostingerArchive'
import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {deliveryConfig} from '@/lib/quittanceDelivery'
import {retrieveReceiptDelivery} from '@/lib/receiptDeliveryStatus'
export async function GET(req:NextRequest){
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:'Non autorisé'},{status:401})
 const id=req.nextUrl.searchParams.get('id');if(!id)return NextResponse.json({error:'Document manquant'},{status:400})
 const{data:q,error}=await s.from('quittances').select('id,locataire_id').eq('id',id).eq('proprietaire_id',user.id).maybeSingle();if(error||!q)return NextResponse.json({error:'Document introuvable'},{status:404})
 const[{data:t},{data:profile}]=await Promise.all([s.from('locataires').select('email').eq('id',q.locataire_id).eq('proprietaire_id',user.id).maybeSingle(),s.from('profiles').select('email').eq('id',user.id).maybeSingle()])
 const{data:history,error:he}=await s.from('quittance_envois').select('id,mode,statut,cree_le,resend_id').eq('quittance_id',id).eq('proprietaire_id',user.id).order('cree_le',{ascending:false}).limit(5)
 let config;try{config=deliveryConfig(profile?.email||user.email||'',t?.email??'')}catch(e){return NextResponse.json({ready:false,message:(e as Error).message,history:history??[]},{headers:{'Cache-Control':'private, no-store'}})}
 return NextResponse.json({ready:!!process.env.RESEND_API_KEY&&!he,mode:config.production?'production':'test',to:config.to,archiveEnabled:config.production&&archiveApplies(profile?.email||user.email||''),bccTo:config.production&&archiveApplies(profile?.email||user.email||'')?[]:config.bcc,message:he?'Journal à activer avec la migration des envois réels.':!process.env.RESEND_API_KEY?'Clé Resend à configurer.':'',history:history??[]},{headers:{'Cache-Control':'private, no-store'}})
}
export async function POST(req:NextRequest){try{
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:'Non autorisé'},{status:401})
 const{id}=await req.json();if(typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id))return NextResponse.json({error:'Envoi invalide'},{status:400})
 const{data:row}=await s.from('quittance_envois').select('*').eq('id',id).eq('proprietaire_id',user.id).maybeSingle();if(!row)return NextResponse.json({error:'Envoi introuvable'},{status:404})
 if(!row.resend_id)return NextResponse.json({status:row.statut,message:'Référence absente : vérifiez la console Resend. Aucun e-mail renvoyé.'})
 const result=await retrieveReceiptDelivery(row)
 if(result.error)return NextResponse.json({error:result.error},{status:result.statusCode??502,headers:{'Cache-Control':'private, no-store'}})
 const status=result.status
 const{data:saved,error}=await s.rpc('resultat_envoi_quittance',{p_id:id,p_statut:status,p_resend:row.resend_id});if(error||!saved)return NextResponse.json({error:'Suivi non enregistré'},{status:503})
 return NextResponse.json({status:saved.statut},{headers:{'Cache-Control':'private, no-store'}})
 }catch{return NextResponse.json({error:'Suivi indisponible. Aucun e-mail renvoyé.'},{status:503})}}
