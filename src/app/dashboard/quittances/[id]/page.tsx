'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function QuittanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [quittance, setQuittance] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQuittance = async () => {
      const supabase = createClient()
      const { id } = await params
      const { data, error } = await supabase
        .from('quittances')
        .select('*, locataires(nom, email), biens(adresse, ville)')
        .eq('id', id)
        .maybeSingle()
      console.log('data:', data, 'error:', error)
      setQuittance(data)
      setLoading(false)
    }
    fetchQuittance()
  }, [params])

  if (loading) return <div className="p-6">Chargement...</div>
  if (!quittance) return <div className="p-6">Quittance introuvable. (id: {params.id})</div>

  const locataire = quittance.locataires as { nom: string; email: string }
  const bien = quittance.biens as { adresse: string; ville: string }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/dashboard/quittances" className="text-blue-600 text-sm hover:underline">
          ← Retour aux quittances
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Quittance de loyer</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          quittance.envoyee ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          {quittance.envoyee ? 'Envoyée' : 'À envoyer'}
        </span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Période</p>
          <p className="text-lg font-semibold">{quittance.mois}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Locataire</p>
            <p className="font-medium">{locataire?.nom}</p>
            <p className="text-sm text-gray-500">{locataire?.email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Bien loué</p>
            <p className="font-medium">{bien?.adresse}</p>
            <p className="text-sm text-gray-500">{bien?.ville}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Détail du règlement</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Loyer hors charges</span>
              <span>{quittance.loyer_hc?.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Charges</span>
              <span>{quittance.charges?.toFixed(2)} €</span>
            </div>
            {quittance.solde !== 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Solde</span>
                <span>{quittance.solde?.toFixed(2)} €</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total réglé</span>
              <span className="text-blue-900">{quittance.total?.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Date de signature</p>
          <p>{quittance.date_signature}</p>
        </div>

        {quittance.commentaire && (
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Commentaire</p>
            <p className="text-gray-600">{quittance.commentaire}</p>
          </div>
        )}
      </div>
    </div>
  )
}