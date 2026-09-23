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

function clean(s: string): string {
  return s.replace(/[\u00a0\u202f\u2009\u2007\u2008\u200b\u200c\u200d\ufeff]/g, ' ').trim()
}

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

async function generateAvoirPdf(params: {
  locataireNom: string
  locataireEmail: string
  proprietaireNom: string
  bienAdresse: string
  bienVille: string
  bienNom: string
  mois: string
  loyerHc: number
  charges: number
  total: number
  dateAvoir: string
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842])
  const { width, height } = page.getSize()

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const gris = rgb(0.4, 0.45, 0.5)
  const noir = rgb(0.07, 0.1, 0.15)
  const rouge = rgb(0.75, 0.15, 0.15)
  const bleu = rgb(0.13, 0.41, 0.9)

  page.drawText('AVOIR SUR QUITTANCE DE LOYER', { x: 50, y: height - 60, size: 18, font: fontBold, color: rouge })
  page.drawText(formatMois(params.mois), { x: 50, y: height - 84, size: 12, font: fontRegular, color: gris })

  page.drawLine({ start: { x: 50, y: height - 100 }, end: { x: width - 50, y: height - 100 }, thickness: 1, color: rgb(0.85, 0.88, 0.92) })

  let y = height - 130

  page.drawText('BAILLEUR', { x: 50, y, size: 8, font: fontBold, color: bleu })
  y -= 18
  page.drawText(params.proprietaireNom, { x: 50, y, size: 11, font: fontBold, color: noir })
  y -= 30

  page.drawText('LOCATAIRE', { x: 50, y, size: 8, font: fontBold, color: bleu })
  y -= 18
  page.drawText(params.locataireNom, { x: 50, y, size: 11, font: fontBold, color: noir })
  y -= 18
  page.drawText(params.locataireEmail, { x: 50, y, size: 10, font: fontRegular, color: gris })
  y -= 30

  page.drawText('BIEN LOUE', { x: 50, y, size: 8, font: fontBold, color: bleu })
  y -= 18
  page.drawText(params.bienNom, { x: 50, y, size: 11, font: fontBold, color: noir })
  y -= 18
  page.drawText(`${params.bienAdresse}, ${params.bienVille}`, { x: 50, y, size: 10, font: fontRegular, color: gris })
  y -= 40

  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.85, 0.88, 0.92) })
  y -= 30

  page.drawText("DETAIL DE L'AVOIR", { x: 50, y, size: 8, font: fontBold, color: bleu })
  y -= 20

  page.drawText('Loyer hors charges', { x: 50, y, size: 10, font: fontRegular, color: gris })
  page.drawText(`-${eur(params.loyerHc)}`, { x: width - 130, y, size: 10, font: fontRegular, color: rouge })
  y -= 18

  page.drawText('Charges', { x: 50, y, size: 10, font: fontRegular, color: gris })
  page.drawText(`-${eur(params.charges)}`, { x: width - 130, y, size: 10, font: fontRegular, color: rouge })
  y -= 18

  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.85, 0.88, 0.92) })
  y -= 18
  page.drawText('TOTAL AVOIR', { x: 50, y, size: 11, font: fontBold, color: noir })
  page.drawText(`-${eur(params.total)}`, { x: width - 130, y, size: 11, font: fontBold, color: rouge })
  y -= 40

  const legal = `Le present avoir annule et remplace la quittance de loyer du mois de ${formatMois(params.mois)} etablie au nom de ${params.locataireNom} pour le logement situe au ${params.bienAdresse}, ${params.bienVille}.`
  const maxWidth = width - 100
  const words = legal.split(' ')
  let line = ''
  const lines: string[] = []
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (fontRegular.widthOfTextAtSize(test, 10) > maxWidth) { lines.push(line); line = word }
    else line = test
  }
  if (line) lines.push(line)
  for (const l of lines) {
    page.drawText(l, { x: 50, y, size: 10, font: fontRegular, color: gris })
    y -= 16
  }
  y -= 24

  page.drawText(`Fait le ${params.dateAvoir}`, { x: 50, y, size: 10, font: fontRegular, color: gris })

  return pdfDoc.save()
}

export async function POST(req: NextRequest) {
  try {
    const { quittanceId } = await req.json()
    if (!quittanceId) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: quittance, error: qErr } = await supabase
      .from('quittances')
      .select('*, locataires(nom, email), biens(nom, adresse, ville)')
      .eq('id', quittanceId)
      .eq('proprietaire_id', user.id)
      .single()

    if (qErr || !quittance) return NextResponse.json({ error: 'Quittance introuvable' }, { status: 404 })

    const { data: profile } = await supabase.from('profiles').select('nom, prenom').eq('id', user.id).single()
    const proprietaireNom = profile
      ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() || user.email!
      : user.email!

    const dateAvoir = formatDateSignature(new Date())

    const pdfBytes = await generateAvoirPdf({
      locataireNom: clean(quittance.locataires?.nom ?? '-'),
      locataireEmail: clean(quittance.locataires?.email ?? ''),
      proprietaireNom: clean(proprietaireNom),
      bienNom: clean(quittance.biens?.nom ?? ''),
      bienAdresse: clean(quittance.biens?.adresse ?? ''),
      bienVille: clean(quittance.biens?.ville ?? ''),
      mois: quittance.mois,
      loyerHc: quittance.loyer_hc,
      charges: quittance.charges,
      total: quittance.total,
      dateAvoir,
    })

    const pdfBase64 = Buffer.from(pdfBytes).toString('base64')
    const fileName = `avoir-${quittance.mois}-${quittance.locataires?.nom?.toLowerCase().replace(/\s+/g, '-') ?? 'locataire'}.pdf`
    const locataireEmail = quittance.locataires?.email
    if (!locataireEmail) return NextResponse.json({ error: 'Email locataire introuvable' }, { status: 400 })

    const emailDest = 'synteyapartners@gmail.com'
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Lokly <onboarding@resend.dev>',
        to: [emailDest],
        subject: `[TEST] Avoir sur quittance — ${formatMois(quittance.mois)}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <p style="color: #ef4444; font-size: 12px; margin-bottom: 16px;">[MODE TEST — en production sera envoyé à : ${locataireEmail}]</p>
            <h2 style="color: #1e293b;">Avoir sur quittance de loyer</h2>
            <p style="color: #64748b;">Bonjour ${quittance.locataires?.nom ?? ''},<br/>
            Veuillez trouver ci-joint l'avoir annulant votre quittance de loyer pour <strong>${formatMois(quittance.mois)}</strong>.</p>
            <div style="background: #fef2f2; border-radius: 12px; padding: 16px;">
              <p style="margin: 0; color: #991b1b; font-weight: 600;">Avoir : -${quittance.total} EUR</p>
            </div>
          </div>
        `,
        attachments: [{ filename: fileName, content: pdfBase64 }],
      }),
    })

    await supabase.from('quittances').update({ envoyee: false }).eq('id', quittanceId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('quittance-avoir error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}