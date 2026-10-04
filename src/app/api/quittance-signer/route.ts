import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQuittancePdf, formatMois, cleanPdfText, MOIS_FR } from '@/lib/generateQuittancePdf'

function formatDateSignature(date: Date): string {
  const j = String(date.getDate()).padStart(2, '0')
  const m = MOIS_FR[date.getMonth()]
  const y = date.getFullYear()
  return `${j} ${m} ${y}`
}

export async function POST(req: NextRequest) {
  try {
    const { quittanceId, otp } = await req.json()
    if (!quittanceId || !otp) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: otpRow, error: otpErr } = await supabase.from('otp_codes').select('*').eq('user_id', user.id).eq('quittance_id', quittanceId).single()
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

    const { data: profile } = await supabase.from('profiles').select('nom, prenom, signature_base64').eq('id', user.id).single()
    const proprietaireNom = profile ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() || user.email! : user.email!
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
      signatureDataUrl: profile?.signature_base64 ?? '',
      dateSignature,
    })

    const pdfBase64 = Buffer.from(pdfBytes).toString('base64')
    const fileName = `quittance-${quittance.mois}-${quittance.locataires?.nom?.toLowerCase().replace(/\s+/g, '-') ?? 'locataire'}.pdf`
    const locataireEmail = quittance.locataires?.email
    if (!locataireEmail) return NextResponse.json({ error: 'Email locataire introuvable' }, { status: 400 })

    const emailDest = 'synteyapartners@gmail.com'
    console.log(`[MODE TEST] Envoi PDF vers ${emailDest} (locataire réel : ${locataireEmail})`)
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Ekolocs <onboarding@resend.dev>',
        to: [emailDest],
        subject: `[TEST] Quittance de loyer - ${formatMois(quittance.mois)}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px"><p style="color:#ef4444;font-size:12px">[MODE TEST - en production sera envoye a : ${locataireEmail}]</p><h2>Quittance de loyer</h2><p>Bonjour ${quittance.locataires?.nom ?? ''},<br/>Veuillez trouver ci-joint votre quittance pour <strong>${formatMois(quittance.mois)}</strong>.</p><div style="background:#f1f5f9;border-radius:12px;padding:16px"><strong>Montant total : ${quittance.total} EUR</strong><br/><span style="color:#64748b">${quittance.biens?.nom ?? ''} - ${quittance.biens?.ville ?? ''}</span></div></div>`,
        attachments: [{ filename: fileName, content: pdfBase64 }],
      }),
    })
    if (!resendRes.ok) console.error('Resend error:', await resendRes.json())

    await supabase.from('quittances').update({ envoyee: true, date_signature: new Date().toISOString() }).eq('id', quittanceId)
    await supabase.from('otp_codes').delete().eq('quittance_id', quittanceId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('quittance-signer error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
