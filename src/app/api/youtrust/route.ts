import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQuittancePdf, cleanPdfText, MOIS_FR } from '@/lib/generateQuittancePdf'

function formatDateSignature(date: Date): string {
  const j = String(date.getDate()).padStart(2, '0')
  const m = MOIS_FR[date.getMonth()]
  const y = date.getFullYear()
  return `${j} ${m} ${y}`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { quittanceId } = await req.json()

  const { data: quittance } = await supabase
    .from('quittances')
    .select('*, locataires(nom, email), biens(nom, adresse, ville)')
    .eq('id', quittanceId)
    .single()

  if (!quittance) return NextResponse.json({ error: 'Quittance introuvable' }, { status: 404 })

  const locataire = quittance.locataires as { nom: string; email: string }
  const bien = quittance.biens as { nom: string; adresse: string; ville: string }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nom, prenom, signature_base64')
    .eq('id', user.id)
    .single()

  const proprietaireNom = profile
    ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() || user.email || 'Le propriétaire'
    : user.email || 'Le propriétaire'
  const reference = `EKO-${String(quittance.mois ?? '').replace('-', '')}-${String(quittance.id).slice(0, 6).toUpperCase()}`

  const pdfBytes = await generateQuittancePdf({
    locataireNom: cleanPdfText(locataire?.nom ?? '-'),
    locataireEmail: cleanPdfText(locataire?.email ?? ''),
    proprietaireNom: cleanPdfText(proprietaireNom),
    proprietaireEmail: cleanPdfText(user.email ?? ''),
    bienNom: cleanPdfText(bien?.nom ?? ''),
    bienAdresse: cleanPdfText(bien?.adresse ?? ''),
    bienVille: cleanPdfText(bien?.ville ?? ''),
    mois: quittance.mois,
    reference,
    loyerHc: Number(quittance.loyer_hc ?? 0),
    charges: Number(quittance.charges ?? 0),
    solde: Number(quittance.solde ?? 0),
    total: Number(quittance.total ?? 0),
    signatureDataUrl: profile?.signature_base64 ?? '',
    dateSignature: formatDateSignature(new Date()),
  })

  const signatureRes = await fetch('https://api-sandbox.yousign.app/v3/signature_requests', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.YOUTRUST_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `Quittance ${quittance.mois} - ${locataire.nom}`,
      delivery_mode: 'email',
    }),
  })

  const signatureData = await signatureRes.json()
  if (!signatureRes.ok) {
    return NextResponse.json({ error: signatureData.message ?? 'Erreur création signature' }, { status: 500 })
  }

  const signatureRequestId = signatureData.id
  const formData = new FormData()
  formData.append('file', new Blob([Buffer.from(pdfBytes)], { type: 'application/pdf' }), `quittance-${quittance.mois}.pdf`)
  formData.append('nature', 'signable_document')

  const docRes = await fetch(`https://api-sandbox.yousign.app/v3/signature_requests/${signatureRequestId}/documents`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.YOUTRUST_API_KEY}` },
    body: formData,
  })

  const docData = await docRes.json()
  if (!docRes.ok) {
    return NextResponse.json({ error: docData.message ?? 'Erreur upload document' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, signatureRequestId, documentId: docData.id })
}
