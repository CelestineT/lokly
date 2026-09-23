import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

function formatMois(mois: string): string {
  const [year, month] = mois.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    .replace(/^./, (c) => c.toUpperCase())
}

async function generateQuittancePdf(params: {
  locataireNom: string
  locataireEmail: string
  proprietaireNom: string
  bienAdresse: string
  bienVille: string
  bienNom: string
  mois: string
  loyerHc: number
  charges: number
  solde: number
  total: number
  signatureDataUrl: string
  dateSignature: string
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // A4
  const { width, height } = page.getSize()

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const gris = rgb(0.4, 0.45, 0.5)
  const noir = rgb(0.07, 0.1, 0.15)
  const bleu = rgb(0.13, 0.41, 0.9)

  // En-tête
  page.drawText('QUITTANCE DE LOYER', {
    x: 50, y: height - 60,
    size: 18, font: fontBold, color: noir,
  })
  page.drawText(formatMois(params.mois), {
    x: 50, y: height - 84,
    size: 12, font: fontRegular, color: gris,
  })

  // Ligne de séparation
  page.drawLine({
    start: { x: 50, y: height - 100 },
    end: { x: width - 50, y: height - 100 },
    thickness: 1, color: rgb(0.85, 0.88, 0.92),
  })

  let y = height - 130

  // Bailleur
  page.drawText('BAILLEUR', { x: 50, y, size: 8, font: fontBold, color: bleu })
  y -= 18
  page.drawText(params.proprietaireNom, { x: 50, y, size: 11, font: fontBold, color: noir })
  y -= 30

  // Locataire
  page.drawText('LOCATAIRE', { x: 50, y, size: 8, font: fontBold, color: bleu })
  y -= 18
  page.drawText(params.locataireNom, { x: 50, y, size: 11, font: fontBold, color: noir })
  y -= 18
  page.drawText(params.locataireEmail, { x: 50, y, size: 10, font: fontRegular, color: gris })
  y -= 30

  // Bien loué
  page.drawText('BIEN LOUÉ', { x: 50, y, size: 8, font: fontBold, color: bleu })
  y -= 18
  page.drawText(params.bienNom, { x: 50, y, size: 11, font: fontBold, color: noir })
  y -= 18
  page.drawText(`${params.bienAdresse}, ${params.bienVille}`, { x: 50, y, size: 10, font: fontRegular, color: gris })
  y -= 40

  // Séparateur
  page.drawLine({
    start: { x: 50, y }, end: { x: width - 50, y },
    thickness: 1, color: rgb(0.85, 0.88, 0.92),
  })
  y -= 30

  // Détail financier
  page.drawText('DÉTAIL DU RÈGLEMENT', { x: 50, y, size: 8, font: fontBold, color: bleu })
  y -= 20

  // Loyer HC
  page.drawText('Loyer hors charges', { x: 50, y, size: 10, font: fontRegular, color: gris })
  page.drawText(`${params.loyerHc.toLocaleString('fr-FR')} €`, {
    x: width - 50 - 60, y, size: 10, font: fontRegular, color: noir,
  })
  y -= 18

  // Charges
  page.drawText('Charges', { x: 50, y, size: 10, font: fontRegular, color: gris })
  page.drawText(`${params.charges.toLocaleString('fr-FR')} €`, {
    x: width - 50 - 60, y, size: 10, font: fontRegular, color: noir,
  })
  y -= 18

  // Solde si non nul
  if (params.solde !== 0) {
    page.drawText('Solde', { x: 50, y, size: 10, font: fontRegular, color: gris })
    const soldeColor = params.solde < 0 ? rgb(0.8, 0.15, 0.15) : rgb(0.1, 0.65, 0.35)
    page.drawText(`${params.solde > 0 ? '+' : ''}${params.solde.toLocaleString('fr-FR')} €`, {
      x: width - 50 - 60, y, size: 10, font: fontRegular, color: soldeColor,
    })
    y -= 18
  }

  // Ligne total
  page.drawLine({
    start: { x: 50, y }, end: { x: width - 50, y },
    thickness: 1, color: rgb(0.85, 0.88, 0.92),
  })
  y -= 18
  page.drawText('TOTAL REÇU', { x: 50, y, size: 11, font: fontBold, color: noir })
  page.drawText(`${params.total.toLocaleString('fr-FR')} €`, {
    x: width - 50 - 60, y, size: 11, font: fontBold, color: noir,
  })
  y -= 40

  // Texte légal
  const legal = `Je soussigné(e), ${params.proprietaireNom}, propriétaire du logement désigné ci-dessus, déclare avoir reçu de ${params.locataireNom} la somme de ${params.total.toLocaleString('fr-FR')} € au titre du loyer et des charges du mois de ${formatMois(params.mois)}, et lui en donne quittance, sous réserve de tous mes droits.`

  // Wrap text
  const maxWidth = width - 100
  const words = legal.split(' ')
  let line = ''
  const lines: string[] = []
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    const w = fontRegular.widthOfTextAtSize(test, 10)
    if (w > maxWidth) { lines.push(line); line = word }
    else line = test
  }
  if (line) lines.push(line)

  for (const l of lines) {
    page.drawText(l, { x: 50, y, size: 10, font: fontRegular, color: gris })
    y -= 16
  }
  y -= 24

  // Date et signature
  page.drawText(`Fait le ${params.dateSignature}`, {
    x: 50, y, size: 10, font: fontRegular, color: gris,
  })
  y -= 24

  page.drawText('Signature du bailleur :', { x: 50, y, size: 10, font: fontBold, color: noir })
  y -= 10

  // Embed signature image
  if (params.signatureDataUrl && params.signatureDataUrl.startsWith('data:image/png;base64,')) {
    const base64 = params.signatureDataUrl.split(',')[1]
    const sigBytes = Buffer.from(base64, 'base64')
    const sigImage = await pdfDoc.embedPng(sigBytes)
    const sigDims = sigImage.scale(0.4)
    page.drawImage(sigImage, {
      x: 50,
      y: y - sigDims.height,
      width: sigDims.width,
      height: sigDims.height,
    })
  }

  return pdfDoc.save()
}

export async function POST(req: NextRequest) {
  try {
    const { quittanceId, otp, signatureDataUrl } = await req.json()
    if (!quittanceId || !otp || !signatureDataUrl) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const supabase = await createClient()

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier l'OTP
    const { data: otpRow, error: otpErr } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('quittance_id', quittanceId)
      .single()

    if (otpErr || !otpRow) {
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
    }
    if (otpRow.code !== otp) {
      return NextResponse.json({ error: 'Code incorrect' }, { status: 400 })
    }
    if (new Date(otpRow.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code expiré' }, { status: 400 })
    }

    // Récupérer la quittance avec locataire et bien
    const { data: quittance, error: qErr } = await supabase
      .from('quittances')
      .select('*, locataires(nom, email), biens(nom, adresse, ville)')
      .eq('id', quittanceId)
      .eq('proprietaire_id', user.id)
      .single()

    if (qErr || !quittance) {
      return NextResponse.json({ error: 'Quittance introuvable' }, { status: 404 })
    }

    // Récupérer le nom du propriétaire
    const { data: profile } = await supabase
      .from('profiles')
      .select('nom, prenom')
      .eq('id', user.id)
      .single()

    const proprietaireNom = profile
      ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() || user.email!
      : user.email!

    const dateSignature = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    })

    // Générer le PDF
    const pdfBytes = await generateQuittancePdf({
      locataireNom: quittance.locataires?.nom ?? '—',
      locataireEmail: quittance.locataires?.email ?? '',
      proprietaireNom,
      bienNom: quittance.biens?.nom ?? '',
      bienAdresse: quittance.biens?.adresse ?? '',
      bienVille: quittance.biens?.ville ?? '',
      mois: quittance.mois,
      loyerHc: quittance.loyer_hc,
      charges: quittance.charges,
      solde: quittance.solde,
      total: quittance.total,
      signatureDataUrl,
      dateSignature,
    })

    const pdfBase64 = Buffer.from(pdfBytes).toString('base64')
    const fileName = `quittance-${quittance.mois}-${quittance.locataires?.nom?.toLowerCase().replace(/\s+/g, '-') ?? 'locataire'}.pdf`

    // Envoyer par email au locataire via Resend
    const locataireEmail = quittance.locataires?.email
    if (!locataireEmail) {
      return NextResponse.json({ error: 'Email locataire introuvable' }, { status: 400 })
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Lokly <onboarding@resend.dev>',
        to: [locataireEmail],
        subject: `Votre quittance de loyer — ${formatMois(quittance.mois)}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #1e293b; margin-bottom: 8px;">Votre quittance de loyer</h2>
            <p style="color: #64748b; margin-bottom: 8px;">
              Bonjour ${quittance.locataires?.nom ?? ''},
            </p>
            <p style="color: #64748b; margin-bottom: 24px;">
              Veuillez trouver ci-joint votre quittance de loyer pour le mois de
              <strong>${formatMois(quittance.mois)}</strong>, signée par votre bailleur.
            </p>
            <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0; color: #1e293b; font-weight: 600;">
                Montant total : ${quittance.total.toLocaleString('fr-FR')} €
              </p>
              <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">
                ${quittance.biens?.nom ?? ''} — ${quittance.biens?.ville ?? ''}
              </p>
            </div>
            <p style="color: #94a3b8; font-size: 12px;">
              Ce document est généré automatiquement par Lokly.
            </p>
          </div>
        `,
        attachments: [
          {
            filename: fileName,
            content: pdfBase64,
          },
        ],
      }),
    })

    if (!resendRes.ok) {
      const resendError = await resendRes.json()
      console.error('Resend error:', resendError)
      return NextResponse.json({ error: 'Erreur envoi email locataire' }, { status: 500 })
    }

    // Mettre à jour la quittance comme envoyée + date_signature
    await supabase
      .from('quittances')
      .update({
        envoyee: true,
        date_signature: new Date().toISOString(),
      })
      .eq('id', quittanceId)

    // Supprimer l'OTP utilisé
    await supabase.from('otp_codes').delete().eq('quittance_id', quittanceId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('quittance-signer error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}