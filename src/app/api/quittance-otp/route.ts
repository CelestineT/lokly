import {randomInt} from 'crypto'
import {deliveryConfig,emailText} from '@/lib/quittanceDelivery'
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
    const code = String(randomInt(100000,1000000))
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

    if(process.env.QUITTANCE_EMAIL_MODE==='production'){
      let config;try{config=deliveryConfig(user.email??'',user.email??'')}catch(e){return NextResponse.json({error:(e as Error).message},{status:503})}
      const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:config.from,to:[user.email],subject:'Ekolocs — code de confirmation',html:`<p>Votre code de confirmation : <strong>${emailText(code)}</strong></p><p>Valable 10 minutes.</p>`})});
      if(!result.ok)return NextResponse.json({error:'Le code n’a pas pu être envoyé au bailleur.'},{status:502});
      return NextResponse.json({ok:true});
    }
    // Recette uniquement : aucun message réel envoyé au bailleur.
    return NextResponse.json({ ok: true, code });

  } catch (err) {
    console.error('quittance-otp error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}