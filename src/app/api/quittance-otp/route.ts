import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { quittanceId } = await req.json()
    if (!quittanceId) {
      return NextResponse.json({ error: 'quittanceId manquant' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: quittance, error: qErr } = await supabase
      .from('quittances')
      .select('id')
      .eq('id', quittanceId)
      .eq('proprietaire_id', user.id)
      .single()

    if (qErr || !quittance) {
      return NextResponse.json({ error: 'Quittance introuvable' }, { status: 404 })
    }

    // Générer un code OTP à 6 chiffres
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: upsertErr } = await supabase.from('otp_codes').upsert({
      user_id: user.id,
      quittance_id: quittanceId,
      code,
      expires_at: expiresAt,
    }, { onConflict: 'quittance_id' })

    if (upsertErr) {
      console.error('OTP upsert error:', upsertErr)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    // Mode test : on retourne le code directement (pas d'email)
    // À remplacer par un envoi Resend quand le domaine sera vérifié
    return NextResponse.json({ ok: true, code })

  } catch (err) {
    console.error('quittance-otp error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}