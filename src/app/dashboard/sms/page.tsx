import TwilioTestPanel from './twilio/TwilioTestPanel'
import {twilioTestConfig,TWILIO_STATUS_LABELS} from '@/lib/twilioTest'
import Link from 'next/link'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {readAllRows} from '@/lib/readAllRows'
import {formatLocataireName} from '@/lib/locataireName'
import SmsPreparation from './SmsPreparation'
import type {SmsRecipient} from '@/lib/smsTemplates'
export default async function SmsPage(){
 const s=await createClient(),{data:{user},error}=await s.auth.getUser()
 if(error||!user)redirect('/login')
 try{
  const [locs,biens,profile]=await Promise.all([
   readAllRows(s.from('locataires').select('id,nom,nom_famille,prenom,civilite,telephone,bien_id,actif').eq('proprietaire_id',user.id)),
   readAllRows(s.from('biens').select('id,nom,ville').eq('proprietaire_id',user.id)),
   s.from('profiles').select('telephone').eq('id',user.id).maybeSingle(),
  ])
  if(profile.error)throw new Error('Profil indisponible')
  const properties=biens.data.map(b=>({id:String(b.id),name:[b.nom,b.ville].filter(Boolean).join(' · ')}))
  const map=new Map(properties.map(b=>[b.id,b.name]))
  const recipients:SmsRecipient[]=locs.data.map(l=>({id:String(l.id),name:formatLocataireName(l),firstName:l.prenom??'',phone:l.telephone??null,propertyId:l.bien_id?String(l.bien_id):null,propertyName:map.get(String(l.bien_id))??'Non rattaché',active:l.actif!==false}))
  const config=twilioTestConfig(user.id)
  const {data:history,error:historyError}=await s.from('sms_test_envois').select('id,statut,segments,destinataire_fin,twilio_sid,code_erreur').eq('proprietaire_id',user.id).order('cree_le',{ascending:false}).limit(5)
  const {data:authorization,error:authorizationError}=await s.from('sms_test_autorisations').select('proprietaire_id').eq('proprietaire_id',user.id).maybeSingle()
  return <><SmsPreparation recipients={recipients} properties={properties} owner={{mail_bailleur:user.email??'',telephone_bailleur:profile.data?.telephone??''}}/><div className="mx-auto max-w-5xl px-4 pb-6 sm:px-6"><TwilioTestPanel config={{ready:config.ready&&!!authorization&&!authorizationError,maskedTo:config.maskedTo,from:config.from,missing:[...config.missing,...(!authorization?['Autorisation SQL du compte Ekolocs']:[])],ownerId:user.id}} historyReady={!historyError} history={(history??[]).map(h=>({id:String(h.id),status:String(h.statut),label:TWILIO_STATUS_LABELS[h.statut]??'État inconnu',segments:Number(h.segments),last4:String(h.destinataire_fin),hasSid:!!h.twilio_sid,errorCode:h.code_erreur??null}))}/></div></>
 }catch{return <div className="p-6"><Link href="/dashboard/locataires" className="text-blue-600">← Locataires</Link><h1 className="mt-4 text-2xl font-bold">Préparer des SMS</h1><p role="alert" className="mt-4 text-red-700">Impossible de charger les destinataires. Rechargez la page pour réessayer.</p></div>}
}
