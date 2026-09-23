import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { quittanceId } = await req.json()
    if (!quittanceId) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: quittance, error: qErr } = await supabase
      .from('quittances')
      .select('id')
      .eq('id', quittanceId)
      .eq('proprietaire_id', user.id)
      .single()

    if (qErr || !quittance) return NextResponse.json({ error: 'Quittance introuvable' }, { status: 404 })

    await supabase.from('quittances').update({ envoyee: false }).eq('id', quittanceId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('quittance-avoir error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}