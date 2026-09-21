'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import jsPDF from 'jspdf'

type Quittance = {
  id: string
  locataire_id: string
  mois: string
  loyer_hc: number
  charges: number
  solde: number
  total: number
  date_signature: string
  caution_affichee: boolean
  commentaire: string | null
}

type Locataire = {
  id: string
  nom: string
  email: string
  bien_id: string
}

type Bien = {
  id: string
  nom: string
  adresse: string
  ville: string
  code_postal: string | null
}

type Proprietaire = {
  email: string
}

function formatMois(mois: string): string {
  const [year, month] = mois.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    .replace(/^./, (c) => c.toUpperCase())
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric'
  })
}

export default function SignaturePage() {
  const params = useParams()
  const router = useRouter()
  const [quittance, setQuittance] = useState<Quittance | null>(null)
  const [locataire, setLocataire] = useState<Locataire | null>(null)
  const [bien, setBien] = useState<Bien | null>(null)
  const [proprietaire, setProprietaire] = useState<Proprietaire | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setProprietaire({ email: user.email ?? '' })

      const { data: q } = await supabase
        .from('quittances')
        .select('*')
        .eq('id', params.id)
        .single()

      if (!q) { router.push('/dashboard/signatures'); return }
      setQuittance(q)

      const [{ data: loc }, ] = await Promise.all([
        supabase.from('locataires').select('id, nom, email, bien_id').eq('id', q.locataire_id).single(),
      ])
      if (loc) {
        setLocataire(loc)
        const { data: b } = await supabase.from('biens').select('id, nom, adresse, ville, code_postal').eq('id', loc.bien_id).single()
        if (b) setBien(b)
      }
      setLoading(false)
    }
    load()
  }, [params.id])

  function generatePDF() {
    if (!quittance || !locataire || !bien) return
    const doc = new jsPDF()
    const mois = formatMois(quittance.mois)

    // En-tête
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('QUITTANCE DE LOYER', 105, 25, { align: 'center' })

    doc.setFontSize(13)
    doc.setFont('helvetica', 'normal')
    doc.text(`Mois de ${mois}`, 105, 35, { align: 'center' })

    // Ligne séparatrice
    doc.setDrawColor(200, 200, 200)
    doc.line(20, 42, 190, 42)

    // Bailleur
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('BAILLEUR', 20, 55)
    doc.setFont('helvetica', 'normal')
    doc.text(proprietaire?.email ?? '', 20, 63)

    // Locataire
    doc.setFont('helvetica', 'bold')
    doc.text('LOCATAIRE', 110, 55)
    doc.setFont('helvetica', 'normal')
    doc.text(locataire.nom, 110, 63)
    doc.text(locataire.email, 110, 70)

    // Bien
    doc.setFont('helvetica', 'bold')
    doc.text('BIEN LOUÉ', 20, 85)
    doc.setFont('helvetica', 'normal')
    doc.text(bien.nom, 20, 93)
    doc.text(bien.adresse, 20, 100)
    doc.text(`${bien.code_postal ?? ''} ${bien.ville}`, 20, 107)

    // Ligne séparatrice
    doc.line(20, 118, 190, 118)

    // Montants
    doc.setFont('helvetica', 'bold')
    doc.text('DÉTAIL DU LOYER', 20, 130)
    doc.setFont('helvetica', 'normal')
    doc.text(`Loyer hors charges :`, 20, 142)
    doc.text(`${quittance.loyer_hc.toLocaleString('fr-FR')} €`, 170, 142, { align: 'right' })
    doc.text(`Charges :`, 20, 151)
    doc.text(`${quittance.charges.toLocaleString('fr-FR')} €`, 170, 151, { align: 'right' })
    if (quittance.solde !== 0) {
      doc.text(`Solde dû :`, 20, 160)
      doc.text(`${quittance.solde.toLocaleString('fr-FR')} €`, 170, 160, { align: 'right' })
    }

    // Total
    doc.setDrawColor(200, 200, 200)
    doc.line(20, 167, 190, 167)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('TOTAL REÇU :', 20, 178)
    doc.text(`${quittance.total.toLocaleString('fr-FR')} €`, 170, 178, { align: 'right' })

    // Attestation
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const attestation = `Je soussigné(e), bailleur du logement désigné ci-dessus, déclare avoir reçu de ${locataire.nom} la somme de ${quittance.total.toLocaleString('fr-FR')} € au titre du loyer et des charges du mois de ${mois}, et lui en donne quittance, sous réserve de tous mes droits.`
    const lines = doc.splitTextToSize(attestation, 170)
    doc.text(lines, 20, 200)

    // Date et signature
    doc.setFontSize(10)
    doc.text(`Fait le ${formatDate(quittance.date_signature)}`, 20, 230)
    doc.text('Signature du bailleur :', 110, 230)
    doc.rect(110, 235, 70, 20)

    // Commentaire
    if (quittance.commentaire) {
      doc.setFontSize(9)
      doc.setTextColor(100)
      doc.text(`Note : ${quittance.commentaire}`, 20, 265)
    }

    // Pied de page
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text('Document généré par Lokly — Gestion locative simplifiée', 105, 285, { align: 'center' })

    doc.save(`quittance-${locataire.nom.replace(' ', '-')}-${quittance.mois}.pdf`)
  }

  async function handleSendEmail() {
    setSending(true)
    // Marquer comme envoyée
    const supabase = createClient()
    await supabase.from('quittances').update({ envoyee: true }).eq('id', quittance!.id)
    setSent(true)
    setSending(false)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!quittance || !locataire) return null

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Retour
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-1">Générer la quittance</h1>
      <p className="text-slate-500 text-sm mb-6">{locataire.nom} — {formatMois(quittance.mois)}</p>

      {/* Aperçu */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4 text-sm uppercase tracking-wide">Aperçu</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Locataire</span>
            <span className="font-medium text-slate-900">{locataire.nom}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Email</span>
            <span className="font-medium text-slate-900">{locataire.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Bien</span>
            <span className="font-medium text-slate-900">{bien?.nom} — {bien?.ville}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Période</span>
            <span className="font-medium text-slate-900">{formatMois(quittance.mois)}</span>
          </div>
          <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between">
            <span className="text-slate-500">Loyer HC</span>
            <span className="font-medium">{quittance.loyer_hc.toLocaleString('fr-FR')} €</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Charges</span>
            <span className="font-medium">{quittance.charges.toLocaleString('fr-FR')} €</span>
          </div>
          {quittance.solde !== 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Solde</span>
              <span className="font-medium">{quittance.solde.toLocaleString('fr-FR')} €</span>
            </div>
          )}
          <div className="border-t border-slate-100 pt-2 flex justify-between font-bold">
            <span className="text-slate-900">Total</span>
            <span className="text-slate-900">{quittance.total.toLocaleString('fr-FR')} €</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          onClick={generatePDF}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Télécharger le PDF
        </button>

        <button
          onClick={handleSendEmail}
          disabled={sending || sent}
          className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-3 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-60"
        >
          {sent ? (
            <>
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Marquée comme envoyée
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Marquer comme envoyée
            </>
          )}
        </button>
      </div>
    </div>
  )
}