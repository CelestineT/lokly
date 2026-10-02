import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQuittancePdfV3 } from '@/lib/generateQuittancePdfV3'

const MOIS_FR=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
function formatDate(date:Date){return `${String(date.getDate()).padStart(2,'0')} ${MOIS_FR[date.getMonth()]} ${date.getFullYear()}`}
function clean(value:string){return String(value??'').replace(/[\u200B-\u200D\uFEFF]/g,' ').trim()}

export async function GET(req:NextRequest){
 try{
  const quittanceId=req.nextUrl.searchParams.get('id')
  if(!quittanceId)return NextResponse.json({error:'Quittance manquante'},{status:400})
  const supabase=await createClient()
  const{data:{user},error:authError}=await supabase.auth.getUser()
  if(authError||!user)return NextResponse.json({error:'Non autorisé'},{status:401})

  const{data:quittance,error:qErr}=await supabase.from('quittances').select('*, locataires(nom,email,bail_id), biens(nom,adresse,ville,type)').eq('id',quittanceId).eq('proprietaire_id',user.id).single()
  if(qErr||!quittance)return NextResponse.json({error:'Quittance introuvable'},{status:404})
  const{data:profile}=await supabase.from('profiles').select('nom,prenom,signature_base64').eq('id',user.id).single()
  const proprietaireNom=`${profile?.prenom??''} ${profile?.nom??''}`.trim()
  if(!proprietaireNom)return NextResponse.json({error:'Profil bailleur incomplet'},{status:400})

  let lotLibelle=''
  const bailId=quittance.locataires?.bail_id
  if(bailId){
   const{data:bail}=await supabase.from('baux').select('lot_id').eq('id',bailId).eq('proprietaire_id',user.id).maybeSingle()
   if(bail?.lot_id){
    const{data:lot}=await supabase.from('lots').select('numero_lot,type,specificite').eq('id',bail.lot_id).maybeSingle()
    if(lot)lotLibelle=[lot.numero_lot,String(lot.type??'').replace(/_/g,' '),lot.specificite].filter(Boolean).join(' — ')
   }
  }

  const signatureDate=quittance.date_signature?new Date(quittance.date_signature):new Date()
  const lotsAnnexes=Array.isArray(quittance.lots_annexes_detail)?quittance.lots_annexes_detail:[]
  const pdfBytes=await generateQuittancePdfV3({locataireNom:clean(quittance.locataires?.nom??'-'),proprietaireNom:clean(proprietaireNom),bienNom:clean(quittance.biens?.nom??''),bienAdresse:clean(quittance.biens?.adresse??''),bienVille:clean(quittance.biens?.ville??''),lotLibelle:clean(lotLibelle),mois:quittance.mois,loyerHc:Number(quittance.loyer_hc??0),charges:Number(quittance.charges??0),lotsAnnexes,solde:Number(quittance.solde??0),total:Number(quittance.total??0),signatureDataUrl:profile?.signature_base64??'',dateSignature:formatDate(signatureDate)})
  const fileName=`quittance-${quittance.mois}-${String(quittance.locataires?.nom??'locataire').toLowerCase().replace(/\s+/g,'-')}.pdf`
  return new NextResponse(Buffer.from(pdfBytes),{status:200,headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${fileName}"`,'Cache-Control':'private, no-store'}})
 }catch(err){console.error('quittance-pdf error:',err);return NextResponse.json({error:'Erreur lors de la génération du PDF'},{status:500})}
}
