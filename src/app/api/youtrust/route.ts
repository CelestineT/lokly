import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQuittancePdf } from '@/lib/generateQuittancePdf'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { quittanceId } = await req.json()

  const { data: quittance } = await supabase
    .from('quittances')
    .select('*, locataires(nom, email), biens(adresse, ville)')
    .eq('id', quittanceId)
    .single()

  if (!quittance) return NextResponse.json({ error: 'Quittance introuvable' }, { status: 404 })

  const locataire = quittance.locataires as { nom: string; email: string }
  const bien = quittance.biens as { adresse: string; ville: string }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const proprietaireNom = profile?.full_name ?? 'Le propriétaire'

  const pdfBytes = await generateQuittancePdf({
    locataireNom: locataire.nom,
    locataireEmail: locataire.email,
    bienAdresse: `${bien?.adresse ?? ''}, ${bien?.ville ?? ''}`,
    mois: quittance.mois,
    loyerHc: quittance.loyer_hc,
    charges: quittance.charges,
    solde: quittance.solde ?? 0,
    total: quittance.total,
    proprietaireNom,
    dateSignature: new Date().toLocaleDateString('fr-FR'),
  })

  // Étape 1 : Créer la demande de signature
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

  // Étape 2 : Uploader le document PDF
  const formData = new FormData()
  formData.append('file', new Blob([Buffer.from(pdfBytes)], { type: 'application/pdf' }), `quittance-${quittance.mois}.pdf`)
  formData.append('nature', 'signable_document')

  const docRes = await fetch(`https://api-sandbox.yousign.app/v3/signature_requests/${signatureRequestId}/documents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.YOUTRUST_API_KEY}`,
    },
    body: formData,
  })

  const docData = await docRes.json()
  if (!docRes.ok) {
    return NextResponse.json({ error: docData.message ?? 'Erreur upload document' }, { status: 500 })
  }

  const documentId = docData.id

  // Étape 3 : Ajouter le signataire avec zone de signature
  const firstName = locataire.nom.split(' ')[0] ?? locataire.nom
  const lastName = locataire.nom.split(' ').slice(1).join(' ') || firstName

  const signerRes = await fetch(`https://api-sandbox.yousign.app/v3/signature_requests/${signatureRequestId}/signers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.YOUTRUST_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      info: {
        first_name: firstName,
        last_name: lastName,
        email: locataire.email,
        locale: 'fr',
      },
      signature_level: 'electronic_signature',
      signature_authentication_mode: 'no_otp',
      fields: [
        {
          document_id: documentId,
          type: 'signature',
          page: 1,
          x: 50,
          y: 50,
          width: 200,
          height: 50,
        }
      ],
    }),
  })

  const signerData = await signerRes.json()
  if (!signerRes.ok) {
    return NextResponse.json({ error: JSON.stringify(signerData) }, { status: 500 })
  }

  // Étape 4 : Activer la demande de signature
  const activateRes = await fetch(`https://api-sandbox.yousign.app/v3/signature_requests/${signatureRequestId}/activate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.YOUTRUST_API_KEY}`,
      'Content-Type': 'application/json',
    },
  })

 if (!activateRes.ok) {
    const activateData = await activateRes.json()
    return NextResponse.json({ error: JSON.stringify(activateData) }, { status: 500 })
  }

  await supabase.from('quittances').update({ envoyee: true }).eq('id', quittanceId)

  return NextResponse.json({ success: true, signatureRequestId })
}