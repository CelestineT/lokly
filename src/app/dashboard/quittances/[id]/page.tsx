'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Quittance = {
  id: string
  locataire_id: string
  bien_id: string | null
  mois: string
  loyer_hc: number
  charges: number
  solde: number
  total: number
  envoyee: boolean
  date_signature: string
  locataires: { nom: string; email: string } | null
  biens: { nom: string; adresse: string; ville: string } | null
}

function formatMois(mois: string): string {
  const [year, month] = mois.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    .replace(/^./, (c) => c.toUpperCase())
}

type Step = 'view' | 'sign' | 'otp' | 'done'

export default function QuittanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [quittance, setQuittance] = useState<Quittance | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [resolvedId, setResolvedId] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('view')
  const [otp, setOtp] = useState('')
  const [otpDisplay, setOtpDisplay] = useState<string | null>(null)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [savedSignatureUrl, setSavedSignatureUrl] = useState<string>('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    params.then(({ id }) => {
      setResolvedId(id)
      const supabase = createClient()
      supabase
        .from('quittances')
        .select('*, locataires(nom, email), biens(nom, adresse, ville)')
        .eq('id', id)
        .single()
        .then(({ data, error }) => {
          if (error || !data) setNotFound(true)
          else setQuittance(data)
          setLoading(false)
        })
    })
  }, [params])

  // Canvas signature helpers
  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    setIsDrawing(true)
    lastPos.current = getPos(e, canvas)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !lastPos.current) return
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.stroke()
    lastPos.current = pos
    setHasSignature(true)
  }

  function stopDraw() {
    setIsDrawing(false)
    lastPos.current = null
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  function getSignatureDataUrl(): string {
    return canvasRef.current?.toDataURL('image/png') ?? ''
  }

  async function handleValiderSignature() {
    if (!hasSignature || !resolvedId) return
    const signatureDataUrl = getSignatureDataUrl()
    setSavedSignatureUrl(signatureDataUrl)
    setSending(true)
    setMessage(null)
    try {
      const res = await fetch('/api/quittance-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quittanceId: resolvedId }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.code) setOtpDisplay(data.code)
        setStep('otp')
      } else {
        setMessage({ text: data.error ?? 'Erreur envoi OTP', ok: false })
      }
    } catch {
      setMessage({ text: 'Erreur réseau', ok: false })
    } finally {
      setSending(false)
    }
  }

  async function handleValiderOtp() {
    if (!otp || !resolvedId) return
    setSending(true)
    setOtpError(null)
    try {
      const res = await fetch('/api/quittance-signer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quittanceId: resolvedId, otp, signatureDataUrl: savedSignatureUrl }),
      })
      const data = await res.json()
      if (res.ok) {
        setQuittance((prev) => prev ? { ...prev, envoyee: true } : prev)
        setStep('done')
      } else {
        setOtpError(data.error ?? 'Code incorrect')
      }
    } catch {
      setOtpError('Erreur réseau')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-100 rounded w-1/3" />
          <div className="h-48 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (notFound || !quittance) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 flex flex-col items-center text-center">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Quittance introuvable</h2>
          <Link href="/dashboard/quittances" className="text-blue-600 text-sm hover:underline mt-4">← Retour aux quittances</Link>
        </div>
      </div>
    )
  }

  const locataire = quittance.locataires
  const bien = quittance.biens

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/quittances" className="text-slate-400 hover:text-slate-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quittance de loyer</h1>
          <p className="text-slate-500 text-sm">{formatMois(quittance.mois)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
        {/* Statut */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Statut</span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${quittance.envoyee ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {quittance.envoyee ? '✓ Signée et envoyée' : 'À signer'}
          </span>
        </div>

        <hr className="border-slate-50" />

        {/* Locataire */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Locataire</p>
          <p className="font-semibold text-slate-900">{locataire?.nom ?? '—'}</p>
          {locataire?.email && <p className="text-sm text-slate-500">{locataire.email}</p>}
        </div>

        {/* Bien */}
        {bien && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Bien loué</p>
            <p className="font-semibold text-slate-900">{bien.nom}</p>
            <p className="text-sm text-slate-500">{bien.adresse}, {bien.ville}</p>
          </div>
        )}

        <hr className="border-slate-50" />

        {/* Détail financier */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Détail du règlement</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Loyer hors charges</span>
              <span className="text-slate-900">{quittance.loyer_hc.toLocaleString('fr-FR')} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Charges</span>
              <span className="text-slate-900">{quittance.charges.toLocaleString('fr-FR')} €</span>
            </div>
            {quittance.solde !== 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Solde</span>
                <span className={quittance.solde < 0 ? 'text-red-600' : 'text-green-600'}>
                  {quittance.solde > 0 ? '+' : ''}{quittance.solde.toLocaleString('fr-FR')} €
                </span>
              </div>
            )}
            <hr className="border-slate-100" />
            <div className="flex justify-between font-bold">
              <span className="text-slate-900">Total</span>
              <span className="text-slate-900">{quittance.total.toLocaleString('fr-FR')} €</span>
            </div>
          </div>
        </div>

        {/* Actions selon l'étape */}
        {!quittance.envoyee && step === 'view' && (
          <div className="pt-2">
            <button
              onClick={() => setStep('sign')}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              ✍🏿 Signer et envoyer au locataire
            </button>
          </div>
        )}

        {/* Étape 1 : Canvas de signature */}
        {step === 'sign' && (
          <div className="pt-2 space-y-3">
            <p className="text-sm font-medium text-slate-700">Tracez votre signature :</p>
            <div className="border-2 border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <canvas
                ref={canvasRef}
                width={560}
                height={160}
                className="w-full touch-none cursor-crosshair"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={clearCanvas}
                className="flex-1 border border-slate-200 text-slate-600 rounded-xl px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors">
                Effacer
              </button>
              <button
                onClick={handleValiderSignature}
                disabled={!hasSignature || sending}
                className="flex-1 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {sending ? 'Envoi du code…' : 'Valider la signature'}
              </button>
            </div>
            {message && <p className="text-xs text-center text-red-500">{message.text}</p>}
          </div>
        )}

        {/* Étape 2 : Saisie OTP */}
        {step === 'otp' && (
          <div className="pt-2 space-y-3">
            <p className="text-sm font-medium text-slate-700">Saisissez le code de confirmation :</p>
            {otpDisplay && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-blue-500 mb-1">Votre code (mode test)</p>
                <p className="text-2xl font-bold tracking-widest text-blue-700">{otpDisplay}</p>
              </div>
            )}
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Code à 6 chiffres"
              maxLength={6}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {otpError && <p className="text-xs text-center text-red-500">{otpError}</p>}
            <button
              onClick={handleValiderOtp}
              disabled={otp.length !== 6 || sending}
              className="w-full bg-blue-600 text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {sending ? 'Vérification…' : 'Confirmer et envoyer au locataire'}
            </button>
          </div>
        )}

        {/* Étape 3 : Succès */}
        {step === 'done' && (
          <div className="pt-2 text-center space-y-2">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-semibold text-slate-900">Quittance signée et envoyée !</p>
            <p className="text-sm text-slate-500">Le locataire a reçu la quittance par email.</p>
          </div>
        )}
      </div>
    </div>
  )
}
