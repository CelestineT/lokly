import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

const MOIS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']

function formatMois(mois: string): string {
  const [year, month] = mois.split('-')
  const m = MOIS_FR[Number(month) - 1]
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${year}`
}

function formatDateSignature(date: Date): string {
  const j = String(date.getDate()).padStart(2, '0')
  const m = MOIS_FR[date.getMonth()]
  const y = date.getFullYear()
  return `${j} ${m} ${y}`
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

  // Helper montants : séparateur espace ASCII 0x20 uniquement
  const eur = (n: number) => {
    const abs = Math.abs(n)
    const str = abs.toFixed(0)
    let formatted = ''
    for (let i = 0; i < str.length; i++) {
      if (i > 0 && (str.length - i) % 3 === 0) formatted += '\x20'
      formatted += str[i]
    }
    return (n < 0 ? '-' : '') + formatted + '\x20EUR'
  }

  // Détail financier
  page.drawText('DETAIL DU REGLEMENT', { x: 50, y, size: 8, font: fontBold, color: bleu })
  y -= 20

  // Loyer HC
  page.drawText('Loyer hors charges', { x: 50, y, size: 10, font: fontRegular, color: gris })
  page.drawText(eur(params.loyerHc), { x: width - 50 - 80, y, size: 10, font: fontRegular, color: noir })
  y -= 18

  // Charges
  page.drawText('Charges', { x: 50, y, size: 10, font: fontRegular, color: gris })
  page.drawText(eur(params.charges), { x: width - 50 - 80, y, size: 10, font: fontRegular, color: noir })
  y -= 18

  // Solde si non nul
  if (params.solde !== 0) {
    page.drawText('Solde', { x: 50, y, size: 10, font: fontRegular, color: gris })
    const soldeColor = params.solde < 0 ? rgb(0.8, 0.15, 0.15) : rgb(0.1, 0.65, 0.35)
    page.drawText(`${params.solde > 0 ? '+' : ''}${eur(params.solde)}`, {
      x: width - 50 - 80, y, size: 10, font: fontRegular, color: soldeColor,
    })
    y -= 18
  }

  // Ligne total
  page.drawLine({
    start: { x: 50, y }, end: { x: width - 50, y },
    thickness: 1, color: rgb(0.85, 0.88, 0.92),
  })
  y -= 18
  page.drawText('TOTAL RECU', { x: 50, y, size: 11, font: fontBold, color: noir })
  page.drawText(eur(params.total), { x: width - 50 - 80, y, size: 11, font: fontBold, color: noir })
  y -= 40

  // Texte légal
  const formatEur = (n: number) => n.toLocaleString('fr-FR').replace(/ /g, ' ').replace(/ /g, ' ')
  const legal = `Je soussigne(e), ${params.proprietaireNom}, proprietaire du logement designe ci-dessus, declare avoir recu de ${params.locataireNom} la somme de ${formatEur(params.total)} EUR au titre du loyer et des charges du mois de ${formatMois(params.mois)}, et lui en donne quittance, sous reserve de tous mes droits.`

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
  if (params.signatureDataUrl && params.signatureDataUrl.includes('base64,')) {
    try {
      const base64 = params.signatureDataUrl.split('base64,')[1]
      if (base64 && base64.length > 100) {
        // Le canvas HTML a un fond transparent → on convertit via une image JPEG avec fond blanc
        // en recréant les bytes PNG tels quels (pdf-lib supporte PNG avec transparence)
        const sigBytes = Buffer.from(base64, 'base64')
        // On tente d'abord PNG, si échec on dessine le rectangle
        let embedded = false
        try {
          const sigImage = await pdfDoc.embedPng(sigBytes)
          const sigDims = sigImage.scaleToFit(220, 90)
          // Fond blanc derrière la signature
          page.drawRectangle({
            x: 50, y: y - sigDims.height,
            width: sigDims.width, height: sigDims.height,
            color: rgb(1, 1, 1),
          })
          page.drawImage(sigImage, {
            x: 50,
            y: y - sigDims.height,
            width: sigDims.width,
            height: sigDims.height,
          })
          embedded = true
        } catch (pngErr) {
          console.error('embedPng failed:', pngErr)
        }
        if (!embedded) {
          page.drawRectangle({ x: 50, y: y - 80, width: 220, height: 80, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 1 })
          page.drawText('(signature non disponible)', { x: 60, y: y - 44, size: 9, font: fontRegular, color: gris })
        }
      } else {
        page.drawRectangle({ x: 50, y: y - 80, width: 220, height: 80, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 1 })
      }
    } catch (e) {
      console.error('Erreur embed signature PNG:', e)
      page.drawRectangle({ x: 50, y: y - 80, width: 220, height: 80, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 1 })
    }
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

    const dateSignature = formatDateSignature(new Date())

    // Nettoyer tous les caractères non-WinAnsi (espaces insécables, etc.)
    function clean(s: string): string {
      return s.replace(/[     ​‌‍﻿]/g, ' ').trim()
    }

    // Générer le PDF
    const pdfBytes = await generateQuittancePdf({
      locataireNom: clean(quittance.locataires?.nom ?? '-'),
      locataireEmail: clean(quittance.locataires?.email ?? ''),
      proprietaireNom: clean(proprietaireNom),
      bienNom: clean(quittance.biens?.nom ?? ''),
      bienAdresse: clean(quittance.biens?.adresse ?? ''),
      bienVille: clean(quittance.biens?.ville ?? ''),
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

    // Mode test : envoi forcé vers synteyapartners@gmail.com (seule adresse autorisée par Resend sans domaine vérifié)
    const emailDest = 'synteyapartners@gmail.com'
    console.log(`[MODE TEST] Envoi PDF vers ${emailDest} (locataire réel : ${locataireEmail})`)

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Lokly <onboarding@resend.dev>',
        to: [emailDest],
        subject: `[TEST] Quittance de loyer — ${formatMois(quittance.mois)}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <p style="color: #ef4444; font-size: 12px; margin-bottom: 16px;">[MODE TEST — en production sera envoyé à : ${locataireEmail}]</p>
            <h2 style="color: #1e293b; margin-bottom: 8px;">Quittance de loyer</h2>
            <p style="color: #64748b; margin-bottom: 24px;">
              Bonjour ${quittance.locataires?.nom ?? ''},<br/>
              Veuillez trouver ci-joint votre quittance de loyer pour <strong>${formatMois(quittance.mois)}</strong>.
            </p>
            <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0; color: #1e293b; font-weight: 600;">Montant total : ${quittance.total} EUR</p>
              <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">${quittance.biens?.nom ?? ''} — ${quittance.biens?.ville ?? ''}</p>
            </div>
          </div>
        `,
        attachments: [{ filename: fileName, content: pdfBase64 }],
      }),
    })

    if (!resendRes.ok) {
      const resendError = await resendRes.json()
      console.error('Resend error:', resendError)
      // Non bloquant en mode test
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