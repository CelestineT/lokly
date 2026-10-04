import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQuittancePdf, cleanPdfText, MOIS_FR } from '@/lib/generateQuittancePdf'

function formatDate(date: Date) {
  return `${String(date.getDate()).padStart(2, '0')} ${MOIS_FR[date.getMonth()]} ${date.getFullYear()}`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { quittanceId } = await req.json()
  const { data: quittance } = await supabase
    .from('quittances')
    .select('*, locataires(nom,email,bail_id), biens(nom,adresse,ville,type)')
    .eq('id', quittanceId)
    .eq('proprietaire_id', user.id)
    .single()
  if (!quittance) return NextResponse.json({ error: 'Quittance introuvable' }, { status: 404 })

  const locataire = quittance.locataires as { nom: string; email: string; bail_id?: string }
  const bien = quittance.biens as { nom?: string; adresse: string; ville: string; type?: string }
  const { data: profile } = await supabase.from('profiles').select('nom,prenom,telephone,signature_base64,iban,bic').eq('id', user.id).single()
  const proprietaireNom = `${profile?.prenom ?? ''} ${profile?.nom ?? ''}`.trim() || user.email || 'Le propriétaire'

  let lot: any = null
  if (locataire?.bail_id) {
    const { data: bail } = await supabase.from('baux').select('lot_id').eq('id', locataire.bail_id).eq('proprietaire_id', user.id).maybeSingle()
    if (bail?.lot_id) {
      const { data: lotData } = await supabase.from('lots').select('numero_lot,type,specificite,surface').eq('id', bail.lot_id).maybeSingle()
      lot = lotData
    }
  }

  const reference = `EKO-${String(quittance.mois ?? '').replace('-', '')}-${String(quittance.id).slice(0, 6).toUpperCase()}`
  const pdfBytes = await generateQuittancePdf({
    locataireNom: cleanPdfText(locataire.nom),
    locataireEmail: cleanPdfText(locataire.email),
    proprietaireNom: cleanPdfText(proprietaireNom),
    proprietaireEmail: cleanPdfText(user.email ?? ''),
    proprietaireTelephone: cleanPdfText(profile?.telephone ?? ''),
    bienNom: cleanPdfText(bien?.nom ?? ''),
    bienAdresse: cleanPdfText(bien?.adresse ?? ''),
    bienVille: cleanPdfText(bien?.ville ?? ''),
    lotNom: cleanPdfText(lot?.numero_lot ?? ''),
    typeLogement: cleanPdfText(lot?.type ?? bien?.type ?? ''),
    specificiteLogement: cleanPdfText(lot?.specificite ?? ''),
    surface: lot?.surface,
    mois: quittance.mois,
    reference,
    loyerHc: Number(quittance.loyer_hc ?? 0),
    charges: Number(quittance.charges ?? 0),
    solde: Number(quittance.solde ?? 0),
    total: Number(quittance.total ?? 0),
    iban: cleanPdfText(profile?.iban ?? ''),
    bic: cleanPdfText(profile?.bic ?? ''),
    signatureDataUrl: profile?.signature_base64 ?? '',
    dateSignature: formatDate(new Date()),
  })

  const signatureRes = await fetch('https://api-sandbox.yousign.app/v3/signature_requests', { method: 'POST', headers: { Authorization: `Bearer ${process.env.YOUTRUST_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: `Quittance ${quittance.mois} - ${locataire.nom}`, delivery_mode: 'email' }) })
  const signatureData = await signatureRes.json()
  if (!signatureRes.ok) return NextResponse.json({ error: signatureData.message ?? 'Erreur création signature' }, { status: 500 })
  const signatureRequestId = signatureData.id

  const formData = new FormData()
  formData.append('file', new Blob([Buffer.from(pdfBytes)], { type: 'application/pdf' }), `quittance-${quittance.mois}.pdf`)
  formData.append('nature', 'signable_document')
  const docRes = await fetch(`https://api-sandbox.yousign.app/v3/signature_requests/${signatureRequestId}/documents`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.YOUTRUST_API_KEY}` }, body: formData })
  const docData = await docRes.json()
  if (!docRes.ok) return NextResponse.json({ error: docData.message ?? 'Erreur upload document' }, { status: 500 })

  const firstName = locataire.nom.split(' ')[0] ?? locataire.nom
  const lastName = locataire.nom.split(' ').slice(1).join(' ') || firstName
  const signerRes = await fetch(`https://api-sandbox.yousign.app/v3/signature_requests/${signatureRequestId}/signers`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.YOUTRUST_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ info: { first_name: firstName, last_name: lastName, email: locataire.email, locale: 'fr' }, signature_level: 'electronic_signature', signature_authentication_mode: 'no_otp', fields: [{ document_id: docData.id, type: 'signature', page: 1, x: 50, y: 50, width: 200, height: 50 }] }) })
  const signerData = await signerRes.json()
  if (!signerRes.ok) return NextResponse.json({ error: JSON.stringify(signerData) }, { status: 500 })

  const activateRes = await fetch(`https://api-sandbox.yousign.app/v3/signature_requests/${signatureRequestId}/activate`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.YOUTRUST_API_KEY}`, 'Content-Type': 'application/json' } })
  if (!activateRes.ok) return NextResponse.json({ error: JSON.stringify(await activateRes.json()) }, { status: 500 })
  await supabase.from('quittances').update({ envoyee: true }).eq('id', quittanceId)
  return NextResponse.json({ success: true, signatureRequestId })
}
