'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ParametresPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [savedSignature, setSavedSignature] = useState<string | null>(null)
  const [previewSignature, setPreviewSignature] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savedProfile, setSavedProfile] = useState(false)
  const [mode, setMode] = useState<'draw' | 'upload'>('upload')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      supabase.from('profiles').select('nom, prenom, email, telephone, signature_base64').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) {
            setNom(data.nom ?? '')
            setPrenom(data.prenom ?? '')
            setEmail(data.email ?? user.email ?? '')
            setTelephone(data.telephone ?? '')
            if (data.signature_base64) setSavedSignature(data.signature_base64)
          }
        })
    })
  }, [])

  useEffect(() => {
    if (mode !== 'draw') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  }, [mode])

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect(); const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height
    if ('touches' in e) return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }
  function startDrawing(e: React.MouseEvent | React.TouchEvent) { const c=canvasRef.current;if(!c)return;const x=c.getContext('2d');if(!x)return;const p=getPos(e,c);x.beginPath();x.moveTo(p.x,p.y);setDrawing(true);setHasSignature(true);setSaved(false);setPreviewSignature(null) }
  function draw(e: React.MouseEvent | React.TouchEvent) { if(!drawing)return;e.preventDefault();const c=canvasRef.current;if(!c)return;const x=c.getContext('2d');if(!x)return;const p=getPos(e,c);x.lineTo(p.x,p.y);x.stroke() }
  function stopDrawing(){setDrawing(false)}
  function clearCanvas(){const c=canvasRef.current;if(!c)return;const x=c.getContext('2d');if(!x)return;x.fillStyle='#ffffff';x.fillRect(0,0,c.width,c.height);setHasSignature(false);setSaved(false)}
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=(ev)=>{setPreviewSignature(ev.target?.result as string);setHasSignature(true);setSaved(false)};r.readAsDataURL(f)}

  async function saveSignature(){setSaving(true);let base64:string|null=null;if(mode==='upload')base64=previewSignature;else{const c=canvasRef.current;if(!c)return;base64=c.toDataURL('image/png')}if(!base64)return;const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user)return;await s.from('profiles').update({signature_base64:base64}).eq('id',user.id);setSavedSignature(base64);setSaving(false);setSaved(true)}

  async function saveProfile(){
    setSavingProfile(true)
    const supabase=createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user){setSavingProfile(false);return}
    await supabase.from('profiles').upsert({id:user.id,nom,prenom,email:email.trim()||user.email||null,telephone:telephone.trim()||null})
    setSavingProfile(false);setSavedProfile(true);setTimeout(()=>setSavedProfile(false),3000)
  }

  const inputClass="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  return <div className="p-6 max-w-2xl mx-auto space-y-8">
    <div><h1 className="text-2xl font-bold text-slate-900">Paramètres</h1><p className="text-slate-500 text-sm mt-1">Gérez votre profil et votre signature.</p></div>
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <h2 className="text-base font-semibold text-slate-800">Informations bailleur</h2><p className="text-sm text-slate-500">Ces informations apparaissent sur vos quittances.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label><input type="text" value={prenom} onChange={e=>setPrenom(e.target.value)} className={inputClass}/></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Nom</label><input type="text" value={nom} onChange={e=>setNom(e.target.value)} className={inputClass}/></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Adresse e-mail</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nom@exemple.fr" className={inputClass}/></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label><input type="tel" value={telephone} onChange={e=>setTelephone(e.target.value)} placeholder="06 00 00 00 00" className={inputClass}/></div>
      </div>
      <div className="flex items-center gap-3"><button onClick={saveProfile} disabled={savingProfile} className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{savingProfile?'Enregistrement…':'Enregistrer'}</button>{savedProfile&&<span className="text-sm text-green-600 font-medium">✓ Sauvegardé</span>}</div>
    </div>
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <h2 className="text-base font-semibold text-slate-800">Signature électronique</h2><p className="text-sm text-slate-500">Votre signature sera automatiquement apposée sur vos quittances PDF.</p>
      {savedSignature&&<div className="space-y-2"><p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Signature enregistrée</p><div className="border border-slate-200 rounded-xl p-3 bg-slate-50 inline-block"><img src={savedSignature} alt="Signature enregistrée" className="h-16 object-contain"/></div></div>}
      <div className="flex gap-2 border-b border-slate-100"><button type="button" onClick={()=>{setMode('upload');setHasSignature(false);setSaved(false)}} className={`px-4 py-2 text-sm font-medium border-b-2 ${mode==='upload'?'border-blue-600 text-blue-600':'border-transparent text-slate-500'}`}>Importer une image</button><button type="button" onClick={()=>{setMode('draw');setHasSignature(false);setSaved(false);setPreviewSignature(null)}} className={`px-4 py-2 text-sm font-medium border-b-2 ${mode==='draw'?'border-blue-600 text-blue-600':'border-transparent text-slate-500'}`}>Dessiner</button></div>
      {mode==='upload'&&<div className="space-y-3"><p className="text-sm text-slate-500">Importez votre signature en PNG, JPG ou SVG.</p><input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleFileUpload}/><button type="button" onClick={()=>fileInputRef.current?.click()} className="border border-slate-200 text-slate-700 rounded-xl px-4 py-2 text-sm font-medium">Choisir un fichier</button>{previewSignature&&<div><img src={previewSignature} alt="Aperçu signature" className="h-16 object-contain"/></div>}</div>}
      {mode==='draw'&&<div className="space-y-2"><p className="text-sm text-slate-500">Dessinez avec la souris ou le doigt.</p><div className="border-2 border-dashed border-slate-200 rounded-xl overflow-hidden touch-none"><canvas ref={canvasRef} width={600} height={180} className="w-full cursor-crosshair" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}/></div><button onClick={clearCanvas} type="button" className="text-xs text-slate-400">Effacer</button></div>}
      <div className="flex items-center gap-3 pt-2"><button onClick={saveSignature} disabled={!hasSignature||saving} className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{saving?'Enregistrement…':'Sauvegarder la signature'}</button>{saved&&<span className="text-sm text-green-600 font-medium">✓ Signature sauvegardée</span>}</div>
    </div>
  </div>
}
