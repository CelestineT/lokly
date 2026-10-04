import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib'

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

function cleanPdfText(value: string): string {
  return String(value ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, ' ')
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function eur(n: number): string {
  const sign = n < 0 ? '-' : ''
  const value = Math.abs(Number(n || 0)).toFixed(2).replace('.', ',')
  const [integer, decimals] = value.split(',')
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${sign}${grouped},${decimals} EUR`
}

function drawWrappedText(
  page: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: PDFFont,
  size: number,
  color: any,
  lineHeight = size + 3,
): number {
  const words = cleanPdfText(text).split(' ')
  let line = ''
  const lines: string[] = []
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  for (const item of lines) {
    page.drawText(item, { x, y, size, font, color })
    y -= lineHeight
  }
  return y
}

async function generateQuittancePdf(params: {
  locataireNom: string
  locataireEmail: string
  proprietaireNom: string
  proprietaireEmail: string
  bienAdresse: string
  bienVille: string
  bienNom: string
  mois: string
  reference: string
  loyerHc: number
  charges: number
  solde: number
  total: number
  signatureDataUrl: string
  dateSignature: string
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842])
  const { width, height } = page.getSize()

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Palette Ekolocs
  const navy = rgb(0.035, 0.075, 0.16)
  const blue = rgb(0.11, 0.22, 0.86)
  const blueSoft = rgb(0.94, 0.96, 1)
  const blueLine = rgb(0.77, 0.82, 1)
  const slate = rgb(0.34, 0.41, 0.52)
  const lightText = rgb(0.47, 0.55, 0.67)
  const border = rgb(0.86, 0.89, 0.93)
  const soft = rgb(0.975, 0.98, 0.99)
  const white = rgb(1, 1, 1)

  const margin = 42
  const contentWidth = width - margin * 2

  // ===== EN-TETE EKOLOCS =====
  page.drawText('EKOLOCS', { x: margin, y: height - 54, size: 21, font: bold, color: blue })
  page.drawText('Gestion locative', { x: margin, y: height - 70, size: 8.5, font: regular, color: lightText })

  page.drawText('QUITTANCE DE LOYER', {
    x: 210, y: height - 55, size: 17, font: bold, color: navy,
  })
  page.drawText(formatMois(params.mois), {
    x: 210, y: height - 74, size: 10.5, font: regular, color: slate,
  })

  const refLabel = `Reference : ${params.reference}`
  const refWidth = regular.widthOfTextAtSize(refLabel, 8)
  page.drawText(refLabel, {
    x: width - margin - refWidth,
    y: height - 72,
    size: 8,
    font: regular,
    color: lightText,
  })

  page.drawLine({
    start: { x: margin, y: height - 92 },
    end: { x: width - margin, y: height - 92 },
    thickness: 1.5,
    color: blue,
  })

  // ===== BAILLEUR / LOCATAIRE =====
  const cardsY = height - 112
  const cardH = 92
  const gap = 12
  const cardW = (contentWidth - gap) / 2

  page.drawRectangle({ x: margin, y: cardsY - cardH, width: cardW, height: cardH, color: soft, borderColor: border, borderWidth: 0.8 })
  page.drawRectangle({ x: margin + cardW + gap, y: cardsY - cardH, width: cardW, height: cardH, color: soft, borderColor: border, borderWidth: 0.8 })

  page.drawText('INFORMATIONS DU BAILLEUR', { x: margin + 14, y: cardsY - 20, size: 8, font: bold, color: blue })
  page.drawText(params.proprietaireNom || '-', { x: margin + 14, y: cardsY - 42, size: 11, font: bold, color: navy })
  if (params.proprietaireEmail) {
    page.drawText(params.proprietaireEmail, { x: margin + 14, y: cardsY - 60, size: 8.5, font: regular, color: slate })
  }

  const rightX = margin + cardW + gap
  page.drawText('INFORMATIONS DU LOCATAIRE', { x: rightX + 14, y: cardsY - 20, size: 8, font: bold, color: blue })
  page.drawText(params.locataireNom || '-', { x: rightX + 14, y: cardsY - 42, size: 11, font: bold, color: navy })
  if (params.locataireEmail) {
    page.drawText(params.locataireEmail, { x: rightX + 14, y: cardsY - 60, size: 8.5, font: regular, color: slate })
  }

  // ===== BIEN / LOT =====
  let y = cardsY - cardH - 18
  page.drawRectangle({ x: margin, y: y - 64, width: contentWidth, height: 64, color: blueSoft, borderColor: blueLine, borderWidth: 0.8 })
  page.drawText('BIEN LOUE', { x: margin + 14, y: y - 18, size: 8, font: bold, color: blue })
  page.drawText(params.bienNom || 'Bien loue', { x: margin + 14, y: y - 38, size: 11, font: bold, color: navy })
  page.drawText(cleanPdfText(`${params.bienAdresse}${params.bienVille ? ` - ${params.bienVille}` : ''}`), {
    x: margin + 14, y: y - 54, size: 8.5, font: regular, color: slate,
  })

  // ===== TABLEAU DU REGLEMENT =====
  y -= 84
  page.drawText('DETAIL DU REGLEMENT', { x: margin, y, size: 9, font: bold, color: navy })
  y -= 16

  const tableX = margin
  const tableW = contentWidth
  const amountW = 125
  const labelW = tableW - amountW
  const rowH = 27

  page.drawRectangle({ x: tableX, y: y - rowH, width: tableW, height: rowH, color: navy })
  page.drawText('LIBELLE', { x: tableX + 12, y: y - 18, size: 8, font: bold, color: white })
  page.drawText('MONTANT', { x: tableX + labelW + 12, y: y - 18, size: 8, font: bold, color: white })
  y -= rowH

  const rows: Array<{ label: string; value: number; muted?: boolean }> = [
    { label: 'Loyer hors charges', value: params.loyerHc },
    { label: 'Charges', value: params.charges },
  ]
  if (params.solde !== 0) rows.push({ label: 'Solde anterieur', value: params.solde })

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    page.drawRectangle({
      x: tableX,
      y: y - rowH,
      width: tableW,
      height: rowH,
      color: i % 2 === 0 ? white : soft,
      borderColor: border,
      borderWidth: 0.5,
    })
    page.drawLine({
      start: { x: tableX + labelW, y },
      end: { x: tableX + labelW, y: y - rowH },
      thickness: 0.5,
      color: border,
    })
    page.drawText(row.label, { x: tableX + 12, y: y - 18, size: 9, font: regular, color: slate })
    const value = eur(row.value)
    const valueW = regular.widthOfTextAtSize(value, 9)
    page.drawText(value, { x: tableX + tableW - 12 - valueW, y: y - 18, size: 9, font: regular, color: navy })
    y -= rowH
  }

  // Lignes prévues pour les futures données fonctionnelles
  const placeholders = ['Lot annexe / complement', 'Regularisation des charges']
  for (const label of placeholders) {
    page.drawRectangle({ x: tableX, y: y - 22, width: tableW, height: 22, color: white, borderColor: border, borderWidth: 0.5 })
    page.drawLine({ start: { x: tableX + labelW, y }, end: { x: tableX + labelW, y: y - 22 }, thickness: 0.5, color: border })
    page.drawText(label, { x: tableX + 12, y: y - 15, size: 7.5, font: regular, color: lightText })
    page.drawText('-', { x: tableX + tableW - 18, y: y - 15, size: 8, font: regular, color: lightText })
    y -= 22
  }

  page.drawRectangle({ x: tableX, y: y - 34, width: tableW, height: 34, color: blueSoft, borderColor: blueLine, borderWidth: 0.8 })
  page.drawText('TOTAL RECU', { x: tableX + 12, y: y - 22, size: 10, font: bold, color: navy })
  const totalText = eur(params.total)
  const totalW = bold.widthOfTextAtSize(totalText, 11)
  page.drawText(totalText, { x: tableX + tableW - 12 - totalW, y: y - 22, size: 11, font: bold, color: blue })
  y -= 52

  // ===== INFORMATIONS COMPLEMENTAIRES =====
  page.drawText('INFORMATIONS COMPLEMENTAIRES', { x: margin, y, size: 8, font: bold, color: blue })
  y -= 14
  page.drawRectangle({ x: margin, y: y - 46, width: contentWidth, height: 46, color: soft, borderColor: border, borderWidth: 0.6 })
  page.drawText('Mode de paiement', { x: margin + 12, y: y - 17, size: 7.5, font: bold, color: lightText })
  page.drawText('A renseigner', { x: margin + 12, y: y - 34, size: 8.5, font: regular, color: slate })
  page.drawText('Commentaire', { x: margin + 190, y: y - 17, size: 7.5, font: bold, color: lightText })
  page.drawText('Aucun commentaire', { x: margin + 190, y: y - 34, size: 8.5, font: regular, color: slate })
  y -= 64

  // ===== TEXTE DE QUITTANCE =====
  const legal = `Je soussigne(e), ${params.proprietaireNom}, bailleur du logement designe ci-dessus, declare avoir recu de ${params.locataireNom} la somme de ${eur(params.total)} au titre du loyer et des charges du mois de ${formatMois(params.mois)}, et lui en donne quittance, sous reserve de tous mes droits.`
  y = drawWrappedText(page, legal, margin, y, contentWidth, regular, 8.2, slate, 11)
  y -= 13

  // ===== COORDONNEES BANCAIRES / SIGNATURE =====
  const bottomCardH = 78
  const bottomW = (contentWidth - gap) / 2
  page.drawRectangle({ x: margin, y: y - bottomCardH, width: bottomW, height: bottomCardH, color: soft, borderColor: border, borderWidth: 0.6 })
  page.drawText('COORDONNEES BANCAIRES', { x: margin + 12, y: y - 17, size: 7.5, font: bold, color: blue })
  page.drawText('IBAN : a renseigner dans les parametres', { x: margin + 12, y: y - 37, size: 7.5, font: regular, color: slate })
  page.drawText('BIC : a renseigner dans les parametres', { x: margin + 12, y: y - 53, size: 7.5, font: regular, color: slate })

  const sigX = margin + bottomW + gap
  page.drawRectangle({ x: sigX, y: y - bottomCardH, width: bottomW, height: bottomCardH, color: white, borderColor: border, borderWidth: 0.6 })
  page.drawText(`Fait le ${params.dateSignature}`, { x: sigX + 12, y: y - 17, size: 7.5, font: regular, color: slate })
  page.drawText('Signature du bailleur', { x: sigX + 12, y: y - 33, size: 7.5, font: bold, color: navy })

  if (params.signatureDataUrl && params.signatureDataUrl.includes('base64,')) {
    try {
      const base64 = params.signatureDataUrl.split('base64,')[1]
      const bytes = Buffer.from(base64, 'base64')
      let image
      try { image = await pdfDoc.embedPng(bytes) } catch { image = await pdfDoc.embedJpg(bytes) }
      const dims = image.scaleToFit(bottomW - 30, 34)
      page.drawImage(image, { x: sigX + 12, y: y - 70, width: dims.width, height: dims.height })
    } catch (error) {
      console.error('Erreur signature PDF:', error)
    }
  }

  // Pied de page
  page.drawText('Ekolocs - Quittance generee automatiquement', {
    x: margin, y: 24, size: 6.8, font: regular, color: lightText,
  })
  const footerRef = params.reference
  const footerW = regular.widthOfTextAtSize(footerRef, 6.8)
  page.drawText(footerRef, { x: width - margin - footerW, y: 24, size: 6.8, font: regular, color: lightText })

  return pdfDoc.save()
}

export async function POST(req: NextRequest) {
  try {
    const { quittanceId, otp } = await req.json()
    if (!quittanceId || !otp) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: otpRow, error: otpErr } = await supabase
      .from('otp_codes').select('*').eq('user_id', user.id).eq('quittance_id', quittanceId).single()

    if (otpErr || !otpRow) return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
    if (otpRow.code !== otp) return NextResponse.json({ error: 'Code incorrect' }, { status: 400 })
    if (new Date(otpRow.expires_at) < new Date()) return NextResponse.json({ error: 'Code expiré' }, { status: 400 })

    const { data: quittance, error: qErr } = await supabase
      .from('quittances')
      .select('*, locataires(nom, email), biens(nom, adresse, ville)')
      .eq('id', quittanceId)
      .eq('proprietaire_id', user.id)
      .single()

    if (qErr || !quittance) return NextResponse.json({ error: 'Quittance introuvable' }, { status: 404 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('nom, prenom, signature_base64')
      .eq('id', user.id)
      .single()

    const proprietaireNom = profile
      ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() || user.email!
      : user.email!

    const signatureDataUrl = profile?.signature_base64 ?? ''
    const dateSignature = formatDateSignature(new Date())
    const reference = `EKO-${String(quittance.mois ?? '').replace('-', '')}-${String(quittance.id).slice(0, 6).toUpperCase()}`

    const pdfBytes = await generateQuittancePdf({
      locataireNom: cleanPdfText(quittance.locataires?.nom ?? '-'),
      locataireEmail: cleanPdfText(quittance.locataires?.email ?? ''),
      proprietaireNom: cleanPdfText(proprietaireNom),
      proprietaireEmail: cleanPdfText(user.email ?? ''),
      bienNom: cleanPdfText(quittance.biens?.nom ?? ''),
      bienAdresse: cleanPdfText(quittance.biens?.adresse ?? ''),
      bienVille: cleanPdfText(quittance.biens?.ville ?? ''),
      mois: quittance.mois,
      reference,
      loyerHc: Number(quittance.loyer_hc ?? 0),
      charges: Number(quittance.charges ?? 0),
      solde: Number(quittance.solde ?? 0),
      total: Number(quittance.total ?? 0),
      signatureDataUrl,
      dateSignature,
    })

    const pdfBase64 = Buffer.from(pdfBytes).toString('base64')
    const fileName = `quittance-${quittance.mois}-${quittance.locataires?.nom?.toLowerCase().replace(/\s+/g, '-') ?? 'locataire'}.pdf`
    const locataireEmail = quittance.locataires?.email
    if (!locataireEmail) return NextResponse.json({ error: 'Email locataire introuvable' }, { status: 400 })

    // Mode test Resend : envoi vers l'adresse autorisee du compte.
    const emailDest = 'synteyapartners@gmail.com'
    console.log(`[MODE TEST] Envoi PDF vers ${emailDest} (locataire réel : ${locataireEmail})`)

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Ekolocs <onboarding@resend.dev>',
        to: [emailDest],
        subject: `[TEST] Quittance de loyer - ${formatMois(quittance.mois)}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px"><p style="color:#ef4444;font-size:12px">[MODE TEST - en production sera envoye a : ${locataireEmail}]</p><h2>Quittance de loyer</h2><p>Bonjour ${quittance.locataires?.nom ?? ''},<br/>Veuillez trouver ci-joint votre quittance pour <strong>${formatMois(quittance.mois)}</strong>.</p><div style="background:#f1f5f9;border-radius:12px;padding:16px"><strong>Montant total : ${quittance.total} EUR</strong><br/><span style="color:#64748b">${quittance.biens?.nom ?? ''} - ${quittance.biens?.ville ?? ''}</span></div></div>`,
        attachments: [{ filename: fileName, content: pdfBase64 }],
      }),
    })

    if (!resendRes.ok) {
      const resendError = await resendRes.json()
      console.error('Resend error:', resendError)
    }

    await supabase.from('quittances').update({ envoyee: true, date_signature: new Date().toISOString() }).eq('id', quittanceId)
    await supabase.from('otp_codes').delete().eq('quittance_id', quittanceId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('quittance-signer error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
