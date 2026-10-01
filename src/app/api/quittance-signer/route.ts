import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQuittancePdfV3 } from '@/lib/generateQuittancePdfV3'

const MOIS_FR=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
function formatMois(value:string){const[y,m]=value.split('-');const label=MOIS_FR[Number(m)-1];return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${y}`}
function formatDate(date:Date){return `${String(date.getDate()).padStart(2,'0')} ${MOIS_FR[date.getMonth()]} ${date.getFullYear()}`}
function clean(value:string){return String(value??'').replace(/[\u200B-\u200D\uFEFF]/g,' ').trim()}

export async function POST(req:NextRequest){
 try{
  const{quittanceId,otp}=await req.json()
  if(!quittanceId||!otp)return NextResponse.json({error:'Données manquantes'},{status:400})
  const supabase=await createClient()
  const{data:{user},error:authError}=await supabase.auth.getUser()
  if(authError||!user)return NextResponse.json({error:'Non autorisé'},{status:401})
  const{data:otpRow,error:otpErr}=await supabase.from('otp_codes').select('*').eq('user_id',user.id).eq('quittance_id',quittanceId).single()
  if(otpErr||!otpRow)return NextResponse.json({error:'Code invalide ou expiré'},{status:400})
  if(otpRow.code!==otp)return NextResponse.json({error:'Code incorrect'},{status:400})
  if(new Date(otpRow.expires_at)<new Date())return NextResponse.json({error:'Code expiré'},{status:400})

  const{data:quittance,error:qErr}=await supabase.from('quittances').select('*, locataires(nom,email,bail_id), biens(nom,adresse,ville,type)').eq('id',quittanceId).eq('proprietaire_id',user.id).single()
  if(qErr||!quittance)return NextResponse.json({error:'Quittance introuvable'},{status:404})
  const{data:profile}=await supabase.from('profiles').select('nom,prenom,signature_base64').eq('id',user.id).single()
  const proprietaireNom=`${profile?.prenom??''} ${profile?.nom??''}`.trim()
  if(!proprietaireNom)return NextResponse.json({error:'Renseignez le prénom et le nom du bailleur dans le profil avant de générer une quittance.'},{status:400})

  let lotLibelle=''
  const bailId=quittance.locataires?.bail_id
  if(bailId){
   const{data:bail}=await supabase.from('baux').select('lot_id').eq('id',bailId).eq('proprietaire_id',user.id).maybeSingle()
   if(bail?.lot_id){
    const{data:lot}=await supabase.from('lots').select('numero_lot,type,specificite').eq('id',bail.lot_id).maybeSingle()
    if(lot)lotLibelle=[lot.numero_lot,String(lot.type??'').replace(/_/g,' '),lot.specificite].filter(Boolean).join(' — ')
   }
  }

  const pdfBytes=await generateQuittancePdfV3({locataireNom:clean(quittance.locataires?.nom??'-'),proprietaireNom:clean(proprietaireNom),bienNom:clean(quittance.biens?.nom??''),bienAdresse:clean(quittance.biens?.adresse??''),bienVille:clean(quittance.biens?.ville??''),lotLibelle:clean(lotLibelle),mois:quittance.mois,loyerHc:Number(quittance.loyer_hc??0),charges:Number(quittance.charges??0),solde:Number(quittance.solde??0),total:Number(quittance.total??0),signatureDataUrl:profile?.signature_base64??'',dateSignature:formatDate(new Date())})
  const locataireEmail=quittance.locataires?.email
  if(!locataireEmail)return NextResponse.json({error:'Email locataire introuvable'},{status:400})
  const pdfBase64=Buffer.from(pdfBytes).toString('base64')
  const fileName=`quittance-${quittance.mois}-${String(quittance.locataires?.nom??'locataire').toLowerCase().replace(/\s+/g,'-')}.pdf`

  const testEmailsRaw=process.env.QUITTANCE_TEST_EMAILS||process.env.QUITTANCE_TEST_EMAIL||''
  const testEmails=testEmailsRaw.split(',').map(email=>email.trim()).filter(Boolean)
  const emailDestinations=testEmails.length>0?testEmails:[locataireEmail]
  const isTest=testEmails.length>0

  const resendRes=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:'Lokly <onboarding@resend.dev>',to:emailDestinations,subject:`${isTest?'[TEST] ':''}Quittance de loyer — ${formatMois(quittance.mois)}`,html:`<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px"><h2>Quittance de loyer</h2><p>Bonjour ${quittance.locataires?.nom??''},<br/>Veuillez trouver ci-joint votre quittance pour <strong>${formatMois(quittance.mois)}</strong>.</p><div style="background:#f1f5f9;border-radius:12px;padding:16px"><strong>Montant total : ${quittance.total} EUR</strong><p>${quittance.biens?.nom??''}${lotLibelle?` — ${lotLibelle}`:''} — ${quittance.biens?.ville??''}</p></div></div>`,attachments:[{filename:fileName,content:pdfBase64}]})})
  if(!resendRes.ok){console.error('Resend error:',await resendRes.json());return NextResponse.json({error:'La quittance a été générée mais l’envoi par e-mail a échoué.'},{status:502})}
  await supabase.from('quittances').update({envoyee:true,date_signature:new Date().toISOString()}).eq('id',quittanceId)
  await supabase.from('otp_codes').delete().eq('quittance_id',quittanceId)
  return NextResponse.json({ok:true})
 }catch(err){console.error('quittance-signer error:',err);return NextResponse.json({error:'Erreur serveur'},{status:500})
}
}
