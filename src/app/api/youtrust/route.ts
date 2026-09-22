import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { quittanceId } = await req.json()

  const { data: quittance } = await supabase
    .from('quittances')
    .select('*, locataires(nom, email)')
    .eq('id', quittanceId)
    .single()

  if (!quittance) return NextResponse.json({ error: 'Quittance introuvable' }, { status: 404 })

  const locataire = quittance.locataires as { nom: string; email: string }

  const response = await fetch('https://api.sandbox.youtrust.co/v1/signature_requests', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.YOUTRUST_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `Quittance ${quittance.mois} - ${locataire.nom}`,
      signers: [
        {
          email: locataire.email,
          first_name: locataire.nom.split(' ')[0],
          last_name: locataire.nom.split(' ').slice(1).join(' ') || locataire.nom,
        }
      ],
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    return NextResponse.json({ error: data.message ?? 'Erreur YouTrust' }, { status: 500 })
  }

  await supabase.from('quittances').update({ envoyee: true }).eq('id', quittanceId)

  return NextResponse.json({ success: true, signatureRequestId: data.id })
}