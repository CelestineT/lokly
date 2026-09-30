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
  const [savingProfile, setSavingProfile] = useState(false)
  const [savedProfile, setSavedProfile] = useState(false)
  const [mode, setMode] = useState<'draw' | 'upload'>('upload')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('nom, prenom, signature_base64').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) {
            setNom(data.nom ?? '')
            setPrenom(data.prenom ?? '')
            if (data.signature_base64) {
              setSavedSignature(data.signature_base64)
            }
          }
        })
    })
  }, [])

  // Canvas setup
  useEffect(() => {
    if (mode !== 'draw') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [mode])

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function startDrawing(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setDrawing(true)
    setHasSignature(true)
    setSaved(false)
    setPreviewSignature(null)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  function stopDrawing() {
    setDrawing(false)
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    setSaved(false)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string
      setPreviewSignature(base64)
      setHasSignature(true)
      setSaved(false)
    }
    reader.readAsDataURL(file)
  }

  async function saveSignature() {
    setSaving(true)
    let base64: string | null = null

    if (mode === 'upload') {
      base64 = previewSignature
    } else {
      const canvas = canvasRef.current
      if (!canvas) return
      base64 = canvas.toDataURL('image/png')
    }

    if (!base64) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ signature_base64: base64 }).eq('id', user.id)
    setSavedSignature(base64)
    setSaving(false)
    setSaved(true)
  }

  async function saveProfile() {
    setSavingProfile(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').upsert({ id: user.id, nom, prenom })
    setSavingProfile(false)
    setSavedProfile(true)
    setTimeout(() => setSavedProfile(false), 3000)
  }

  const inputClass = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-slate-500 text-sm mt-1">Gérez votre profil et votre signature.</p>
      </div>

      {/* Profil */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Informations bailleur</h2>
        <p className="text-sm text-slate-500">Ces informations apparaissent sur vos quittances.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
            <input type="text" value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Célestine" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
            <input type="text" value={nom} onChange={e => setNom(e.target.value)} placeholder="Tsondo" className={inputClass} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={saveProfile} disabled={savingProfile}
            className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
            {savingProfile ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {savedProfile && <span className="text-sm text-green-600 font-medium">✓ Sauvegardé</span>}
        </div>
      </div>

      {/* Signature */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Signature électronique</h2>
        <p className="text-sm text-slate-500">
          Votre signature sera automatiquement apposée sur vos quittances PDF.
        </p>

        {/* Signature actuelle */}
        {savedSignature && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Signature enregistrée</p>
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={savedSignature} alt="Signature enregistrée" className="h-16 object-contain" />
            </div>
          </div>
        )}

        {/* Onglets draw / upload */}
        <div className="flex gap-2 border-b border-slate-100 pb-0">
          <button
            type="button"
            onClick={() => { setMode('upload'); setHasSignature(false); setSaved(false) }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${mode === 'upload' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            Importer une image
          </button>
          <button
            type="button"
            onClick={() => { setMode('draw'); setHasSignature(false); setSaved(false); setPreviewSignature(null) }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${mode === 'draw' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            Dessiner
          </button>
        </div>

        {/* Mode upload */}
        {mode === 'upload' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Importez votre signature en PNG, JPG ou SVG.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 border border-slate-200 text-slate-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Choisir un fichier
            </button>
            {previewSignature && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">Aperçu</p>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewSignature} alt="Aperçu signature" className="h-16 object-contain" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mode dessin */}
        {mode === 'draw' && (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Dessinez avec la souris ou le doigt.</p>
            <div className="border-2 border-dashed border-slate-200 rounded-xl overflow-hidden touch-none">
              <canvas
                ref={canvasRef}
                width={600}
                height={180}
                className="w-full cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <button onClick={clearCanvas} type="button" className="text-xs text-slate-400 hover:text-slate-600">
              Effacer
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button onClick={saveSignature} disabled={!hasSignature || saving}
            className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
            {saving ? 'Enregistrement…' : 'Sauvegarder la signature'}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">✓ Signature sauvegardée</span>}
        </div>
      </div>
    </div>
  )
}