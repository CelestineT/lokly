import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQuittancePdf, cleanPdfText, MOIS_FR } from '@/lib/generateQuittancePdf'

function formatDateSignature(date: Date): string {
  const j = String(date.getDate()).padStart(2, '0')
  const m = MOIS_FR[date.getMonth()]
  return `${j} ${m} ${date.getFullYear()}`
}

export async function GET(req: NextRequest) {
  try {
    const quittanceId = req.nextUrl.searchParams.get('id')
    if (!quittanceId) return NextResponse.json({ error: 'Quittance manquante' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: quittance, error } = await supabase
      .from('quittances')
      .select('*, locataires(nom, email), biens(nom, adresse, ville)')
      .eq('id', quittanceId)
      .eq('proprietaire_id', user.id)
      .single()
    if (error || !quittance) return NextResponse.json({ error: 'Quittance introuvable' }, { status: 404 })

    const { data: profile } = await supabase.from('profiles').select('nom, prenom, signature_base64').eq('id', user.id).single()
    const proprietaireNom = profile ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() || user.email! : user.email!
    const reference = `EKO-${String(quittance.mois ?? '').replace('-', '')}-${String(quittance.id).slice(0, 6).toUpperCase()}`
    const signatureDate = quittance.date_signature ? new Date(quittance.date_signature) : new Date()

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
      dateSignature: formatDateSignature(signatureDate),
    })

    const fileName = `quittance-${quittance.mois}-${quittance.locataires?.nom?.toLowerCase().replace(/\s+/g, '-') ?? 'locataire'}.pdf`
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${fileName}"`, 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('quittance-pdf error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
