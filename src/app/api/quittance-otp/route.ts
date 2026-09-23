import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { quittanceId } = await req.json()
    if (!quittanceId) {
      return NextResponse.json({ error: 'quittanceId manquant' }, { status: 400 })
    }

    const supabase = await createClient()

    // Vérifier l'utilisateur connecté
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que la quittance appartient à ce propriétaire
    const { data: quittance, error: qErr } = await supabase
      .from('quittances')
      .select('id, locataire_id, mois')
      .eq('id', quittanceId)
      .eq('proprietaire_id', user.id)
      .single()

    if (qErr || !quittance) {
      return NextResponse.json({ error: 'Quittance introuvable' }, { status: 404 })
    }

    // Générer un code OTP à 6 chiffres
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

    // Stocker l'OTP dans Supabase (table otp_codes)
    await supabase.from('otp_codes').upsert({
      user_id: user.id,
      quittance_id: quittanceId,
      code,
      expires_at: expiresAt,
    }, { onConflict: 'quittance_id' })

    // Envoyer l'OTP par email via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Lokly <onboarding@resend.dev>',
        to: [user.email!],
        subject: `Code de confirmation : ${code}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #1e293b; margin-bottom: 8px;">Confirmez votre signature</h2>
            <p style="color: #64748b; margin-bottom: 24px;">
              Vous êtes sur le point de signer une quittance de loyer.
              Voici votre code de confirmation :
            </p>
            <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1e293b;">${code}</span>
            </div>
            <p style="color: #94a3b8; font-size: 13px;">
              Ce code est valable 10 minutes. Si vous n'avez pas demandé ce code, ignorez cet email.
            </p>
          </div>
        `,
      }),
    })

    if (!resendRes.ok) {
      const resendError = await resendRes.json()
      console.error('Resend error:', resendError)
      return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('quittance-otp error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}