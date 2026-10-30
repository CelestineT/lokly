'use client'

import './parametres.css'
import SettingsOverview,{type SettingsSection} from './SettingsOverview'
import Link from 'next/link'
import {ArrowLeft, UserRound, Landmark, Pencil, ShieldCheck, KeyRound, Mail, Bell, SlidersHorizontal, CloudDownload, CircleHelp, FileText, Building2, Users, ArrowRight} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ContinuityPanel from './ContinuityPanel'

export default function ParametresPage() {
  const [section,setSection]=useState<SettingsSection>('overview')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [savedSignature, setSavedSignature] = useState<string | null>(null)
  const [previewSignature, setPreviewSignature] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [signatureError, setSignatureError] = useState<string | null>(null)
  const [civilite, setCivilite] = useState('')
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [titulaireCompte, setTitulaireCompte] = useState('')
  const [iban, setIban] = useState('')
  const [bic, setBic] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savedProfile, setSavedProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [mode, setMode] = useState<'draw' | 'upload'>('upload')

  useEffect(() => {
    let active = true
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (!active) return
      if (authError || !user) { setProfileError(authError?.message || 'Session utilisateur introuvable.'); setLoadingProfile(false); return }
      setEmail('')
      const { data, error } = await supabase.from('profiles').select('civilite, nom, prenom, email, telephone, titulaire_compte, iban, bic, signature_base64').eq('id', user.id).maybeSingle()
      if (!active) return
      if (error) { console.error('Chargement du profil impossible:', error); setProfileError(`Impossible de charger les informations enregistrées : ${error.message}`) }
      else if (data) {
        setCivilite(data.civilite ?? ''); setNom(data.nom ?? ''); setPrenom(data.prenom ?? ''); setEmail(data.email ?? ''); setTelephone(data.telephone ?? ''); setTitulaireCompte(data.titulaire_compte ?? ''); setIban(data.iban ?? ''); setBic(data.bic ?? ''); if (data.signature_base64) setSavedSignature(data.signature_base64)
      }
      setLoadingProfile(false)
    }
    loadProfile(); return () => { active = false }
  }, [])

  useEffect(() => { if (mode !== 'draw') return; const canvas=canvasRef.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#1e293b';ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round' }, [mode])
  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) { const rect=canvas.getBoundingClientRect();const scaleX=canvas.width/rect.width;const scaleY=canvas.height/rect.height;if('touches' in e)return{x:(e.touches[0].clientX-rect.left)*scaleX,y:(e.touches[0].clientY-rect.top)*scaleY};return{x:(e.clientX-rect.left)*scaleX,y:(e.clientY-rect.top)*scaleY} }
  function startDrawing(e: React.MouseEvent | React.TouchEvent){const c=canvasRef.current;if(!c)return;const x=c.getContext('2d');if(!x)return;const p=getPos(e,c);x.beginPath();x.moveTo(p.x,p.y);setDrawing(true);setHasSignature(true);setSaved(false);setSignatureError(null);setPreviewSignature(null)}
  function draw(e: React.MouseEvent | React.TouchEvent){if(!drawing)return;e.preventDefault();const c=canvasRef.current;if(!c)return;const x=c.getContext('2d');if(!x)return;const p=getPos(e,c);x.lineTo(p.x,p.y);x.stroke()}
  function stopDrawing(){setDrawing(false)}
  function clearCanvas(){const c=canvasRef.current;if(!c)return;const x=c.getContext('2d');if(!x)return;x.fillStyle='#ffffff';x.fillRect(0,0,c.width,c.height);setHasSignature(false);setSaved(false);setSignatureError(null)}
  function handleFileUpload(e:React.ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=(ev)=>{setPreviewSignature(ev.target?.result as string);setHasSignature(true);setSaved(false);setSignatureError(null)};r.readAsDataURL(f)}

  async function saveSignature(){setSaving(true);setSaved(false);setSignatureError(null);let base64:string|null=null;if(mode==='upload')base64=previewSignature;else{const c=canvasRef.current;if(c)base64=c.toDataURL('image/png')}if(!base64){setSignatureError('Aucune signature à enregistrer.');setSaving(false);return}const s=createClient();const{data:{user},error:authError}=await s.auth.getUser();if(authError||!user){setSignatureError(authError?.message||'Session utilisateur introuvable.');setSaving(false);return}const{error}=await s.from('profiles').upsert({id:user.id,signature_base64:base64},{onConflict:'id'});if(error){console.error('Sauvegarde signature impossible:',error);setSignatureError(`La signature n’a pas été sauvegardée : ${error.message}`);setSaving(false);return}setSavedSignature(base64);setSaving(false);setSaved(true);setTimeout(()=>setSaved(false),3000)}

  async function saveProfile(){
    setSavingProfile(true);setSavedProfile(false);setProfileError(null)
    const supabase=createClient();const{data:{user},error:authError}=await supabase.auth.getUser()
    if(authError||!user){setProfileError(authError?.message||'Session utilisateur introuvable.');setSavingProfile(false);return}
    const payload={id:user.id,civilite:civilite||null,nom:nom.trim()||null,prenom:prenom.trim()||null,email:email.trim()||null,telephone:telephone.trim()||null,titulaire_compte:titulaireCompte.trim()||null,iban:iban.replace(/\s+/g,'').toUpperCase()||null,bic:bic.replace(/\s+/g,'').toUpperCase()||null}
    const{data,error}=await supabase.from('profiles').upsert(payload,{onConflict:'id'}).select('civilite, nom, prenom, email, telephone, titulaire_compte, iban, bic').single()
    if(error){console.error('Sauvegarde profil impossible:',error);setProfileError(`Les informations n’ont pas été sauvegardées : ${error.message}`);setSavingProfile(false);return}
    setCivilite(data.civilite??'');setNom(data.nom??'');setPrenom(data.prenom??'');setEmail(data.email??'');setTelephone(data.telephone??'');setTitulaireCompte(data.titulaire_compte??'');setIban(data.iban??'');setBic(data.bic??'');setSavingProfile(false);setSavedProfile(true);setTimeout(()=>setSavedProfile(false),3000)
  }

  const panelMeta = {profile:[UserRound,'Coordonnées du bailleur','Vos coordonnées et informations bancaires pour vos documents.'],documents:[Pencil,'Signature et documents','Personnalisez les informations et la signature de vos quittances.'],notifications:[Bell,'Notifications et communication','Retrouvez vos canaux de communication avec vos locataires.'],security:[ShieldCheck,'Sécurité et accès','Préparez la récupération de votre compte et la continuité de votre activité.'],backup:[CloudDownload,'Sauvegardes et données','Conservez une copie de vos informations et préparez leur restauration.'],display:[SlidersHorizontal,'Préférences d’affichage','Organisez votre parc selon vos habitudes.'],help:[CircleHelp,'Aide et conseils','Retrouvez les réponses aux questions les plus courantes.'],overview:[UserRound,'Paramètres','Personnalisez vos documents et gérez les réglages de l’application.']} as const
  const [PanelIcon,panelTitle,panelSubtitle]=panelMeta[section]
  const inputClass='w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  return <div className="settings-ui"><header className={`settings-heading ${section!=='overview'?'settings-subheading':''}`}>{section!=='overview'&&<span className="settings-icon"><PanelIcon size={28}/></span>}<div><h1>{panelTitle}</h1><p>{panelSubtitle}</p></div></header>{section==='overview'&&profileError&&<p role="alert" className="text-sm text-red-700">{profileError}</p>}{section==='overview'&&<SettingsOverview name={[civilite,nom,prenom].filter(Boolean).join(' ')} contact={!!email&&!!telephone} signature={!!savedSignature} bank={!!iban&&!!bic} onOpen={setSection}/>}<div className="settings-panel" hidden={section==='overview'}><button type="button" className="settings-back" onClick={()=>setSection('overview')}><ArrowLeft size={16}/> Retour aux paramètres</button>
    
    <div hidden={section!=='profile'&&section!=='documents'} className="settings-editor bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <h2 className="settings-block-title"><UserRound size={21}/> Informations bailleur</h2><p className="text-sm text-slate-500">Ces informations apparaissent sur vos quittances. Renseignez ici votre e-mail professionnel ; le mail privé de récupération ne sera jamais repris automatiquement.</p>
      {loadingProfile&&<div className="text-sm text-slate-500">Chargement des informations…</div>}
      <div className="settings-fields grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="settings-civilite">Civilité</label><select id="settings-civilite" value={civilite} onChange={e=>{setCivilite(e.target.value);setSavedProfile(false)}} className={inputClass}><option value="">Sélectionner</option><option value="M.">M.</option><option value="Mme">Mme</option></select></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="settings-nom">Nom</label><input type="text" id="settings-nom" value={nom} onChange={e=>{setNom(e.target.value);setSavedProfile(false)}} className={inputClass}/></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="settings-prenom">Prénom</label><input type="text" id="settings-prenom" value={prenom} onChange={e=>{setPrenom(e.target.value);setSavedProfile(false)}} className={inputClass}/></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="settings-email">E-mail public du bailleur (quittances)</label><input type="email" id="settings-email" value={email} onChange={e=>{setEmail(e.target.value);setSavedProfile(false)}} placeholder="nom@exemple.fr" className={inputClass}/></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="settings-telephone">Téléphone</label><input type="tel" id="settings-telephone" value={telephone} onChange={e=>{setTelephone(e.target.value);setSavedProfile(false)}} placeholder="06 00 00 00 00" className={inputClass}/></div>
      </div>
      <div className="settings-bank space-y-4"><div><h3 className="settings-block-title"><Landmark size={21}/> Coordonnées bancaires</h3><p className="text-xs text-slate-500 mt-1">Facultatives. Elles pourront être affichées sur les quittances pour faciliter les règlements.</p></div><div><label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="settings-titulaireCompte">Titulaire du compte</label><input type="text" id="settings-titulaireCompte" value={titulaireCompte} onChange={e=>{setTitulaireCompte(e.target.value);setSavedProfile(false)}} placeholder="Prénom NOM ou raison sociale" className={inputClass}/></div><div><label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="settings-iban">IBAN</label><input type="text" id="settings-iban" value={iban} onChange={e=>{setIban(e.target.value.toUpperCase());setSavedProfile(false)}} placeholder="FR76 …" autoCapitalize="characters" autoComplete="off" className={inputClass}/></div><div className="sm:max-w-xs"><label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="settings-bic">BIC / SWIFT</label><input type="text" id="settings-bic" value={bic} onChange={e=>{setBic(e.target.value.toUpperCase());setSavedProfile(false)}} placeholder="XXXXXXXX" autoCapitalize="characters" autoComplete="off" className={inputClass}/></div></div>
      {profileError&&<div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">{profileError}</div>}
      <div className="settings-savebar flex items-center gap-3"><button onClick={saveProfile} disabled={savingProfile||loadingProfile} className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{savingProfile?'Enregistrement…':'Enregistrer'}</button>{savedProfile&&<span className="text-sm text-green-600 font-medium">✓ Sauvegardé</span>}</div>
    </div>
    <div hidden={section!=='documents'} className="settings-editor bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4"><h2 className="settings-block-title"><Pencil size={21}/> Signature du bailleur</h2><p className="text-sm text-slate-500">Votre signature sera automatiquement apposée sur vos quittances PDF.</p>{savedSignature&&<div className="space-y-2"><p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Signature enregistrée</p><div className="border border-slate-200 rounded-xl p-3 bg-slate-50 inline-block"><img src={savedSignature} alt="Signature enregistrée" className="h-16 object-contain"/></div></div>}<div className="flex gap-2 border-b border-slate-100"><button type="button" onClick={()=>{setMode('upload');setHasSignature(false);setSaved(false);setSignatureError(null)}} className={`px-4 py-2 text-sm font-medium border-b-2 ${mode==='upload'?'border-blue-600 text-blue-600':'border-transparent text-slate-500'}`}>Importer une image</button><button type="button" onClick={()=>{setMode('draw');setHasSignature(false);setSaved(false);setSignatureError(null);setPreviewSignature(null)}} className={`px-4 py-2 text-sm font-medium border-b-2 ${mode==='draw'?'border-blue-600 text-blue-600':'border-transparent text-slate-500'}`}>Dessiner</button></div>{mode==='upload'&&<div className="space-y-3"><p className="text-sm text-slate-500">Importez votre signature en PNG, JPG ou SVG.</p><input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleFileUpload}/><button type="button" onClick={()=>fileInputRef.current?.click()} className="border border-slate-200 text-slate-700 rounded-xl px-4 py-2 text-sm font-medium">Choisir un fichier</button>{previewSignature&&<div><img src={previewSignature} alt="Aperçu signature" className="h-16 object-contain"/></div>}</div>}{mode==='draw'&&<div className="space-y-2"><p className="text-sm text-slate-500">Dessinez avec la souris ou le doigt.</p><div className="border-2 border-dashed border-slate-200 rounded-xl overflow-hidden touch-none"><canvas ref={canvasRef} width={600} height={180} className="w-full cursor-crosshair" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}/></div><button onClick={clearCanvas} type="button" className="text-xs text-slate-400">Effacer</button></div>}{signatureError&&<div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">{signatureError}</div>}<div className="flex items-center gap-3 pt-2"><button onClick={saveSignature} disabled={!hasSignature||saving} className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{saving?'Enregistrement…':'Sauvegarder la signature'}</button>{saved&&<span className="text-sm text-green-600 font-medium">✓ Signature sauvegardée</span>}</div></div>
    <section hidden={section!=='documents'} className="settings-info"><h2 className="settings-block-title"><FileText size={21}/> Mentions des documents</h2><p>Parc immobilier à destination de tous publics</p><p>Notre site : <a href="https://ekolocs.fr" target="_blank" rel="noopener noreferrer">ekolocs.fr</a></p><p>Ces mentions font partie du modèle des quittances. Elles ne se modifient pas depuis cet écran.</p></section><div hidden={section!=='backup'}><ContinuityPanel/></div>
{section==='notifications'&&<section className="settings-info"><h2 className="settings-block-title"><Bell size={21}/> Notifications et communication</h2><p>Les SMS se préparent dans Communication. Le test Twilio conserve son destinataire de test et ses confirmations.</p><Link href="/dashboard/sms"><Bell size={19}/> Ouvrir Communication <ArrowRight size={17}/></Link><p>Pour les quittances, utilisez le parcours de signature et d’envoi du document. Aucun envoi automatique supplémentaire n’est activé ici.</p><Link href="/dashboard/quittances"><FileText size={19}/> Ouvrir les quittances <ArrowRight size={17}/></Link></section>}
{section==='security'&&<div className="settings-guides"><section className="settings-info"><span className="settings-icon"><KeyRound/></span><h2>Identifiants et récupération</h2><p>Conservez vos identifiants dans un gestionnaire de mots de passe.</p><div className="settings-callout"><Mail size={20}/><p>Vérifiez que votre adresse e-mail de récupération reste accessible.</p></div><small>Ces conseils ne modifient pas votre mot de passe.</small></section><section className="settings-info"><span className="settings-icon"><ShieldCheck/></span><h2>Continuité d’accès</h2><p>Préparez les accès administrateur de secours dans Supabase, Vercel, GitHub et chez le gestionnaire du domaine.</p><div className="settings-callout"><Users size={20}/><p>Un compte Ekolocs distinct ne donne pas accès à vos données.</p></div><button type="button" onClick={()=>setSection('backup')}>Ouvrir le guide et les sauvegardes <ArrowRight size={17}/></button></section></div>}
{section==='display'&&<section className="settings-info"><h2 className="settings-block-title"><SlidersHorizontal size={21}/> Préférences d’affichage</h2><p>Réorganisez vos cartes depuis les boutons « Réorganiser » des pages Biens et Locataires.</p><Link href="/dashboard/biens"><Building2 size={19}/> Réorganiser mes biens <ArrowRight size={17}/></Link><Link href="/dashboard/locataires"><Users size={19}/> Réorganiser mes locataires <ArrowRight size={17}/></Link><p>Les dates et les montants utilisent actuellement les formats français. Aucun autre format n’est activé dans l’application.</p></section>}
{section==='help'&&<section className="settings-info"><h2 className="settings-block-title"><CircleHelp size={21}/> Besoin d’aide ?</h2><details><summary>Modifier les informations de mes quittances</summary><p>Les coordonnées, l’IBAN et la signature se modifient dans les rubriques Coordonnées du bailleur et Signature et documents.</p></details><details><summary>Garder une copie de mes données</summary><p>Préparez une archive chiffrée depuis Sauvegardes et données et conservez sa phrase secrète séparément.</p></details><button type="button" onClick={()=>setSection('backup')}>Ouvrir les sauvegardes →</button></section>}
</div>
  </div>
}
