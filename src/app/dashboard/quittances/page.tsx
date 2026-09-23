'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Quittance = {
  id: string
  locataire_id: string
  bien_id: string | null
  mois: string
  loyer_hc: number
  charges: number
  solde: number
  total: number
  envoyee: boolean
  date_signature: string
}

type Locataire = { id: string; nom: string; bien_id: string }
type Bien = { id: string; nom: string; ville: string }

function formatMois(mois: string): string {
  const [year, month] = mois.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    .replace(/^./, (c) => c.toUpperCase())
}

export default function QuittancesPage() {
  const [quittances, setQuittances] = useState<Quittance[]>([])
  const [locataires, setLocataires] = useState<Locataire[]>([])
  const [biens, setBiens] = useState<Bien[]>([])

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('quittances').select('*').order('mois', { ascending: false }),
      supabase.from('locataires').select('id, nom, bien_id'),
      supabase.from('biens').select('id, nom, ville'),
    ]).then(([{ data: q }, { data: l }, { data: b }]) => {
      if (q) setQuittances(q)
      if (l) setLocataires(l)
      if (b) setBiens(b)
    })
  }, [])

  const locatairesMap = new Map(locataires.map((l) => [l.id, l]))
  const biensMap = new Map(biens.map((b) => [b.id, b]))

  const grouped = new Map<string, Quittance[]>()
  for (const q of quittances) {
    const list = grouped.get(q.mois) ?? []
    list.push(q)
    grouped.set(q.mois, list)
  }
  const sortedMois = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quittances de loyer</h1>
          <p className="text-slate-500 text-sm mt-1">
            {quittances.length} quittance{quittances.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/dashboard/quittances/nouvelle"
          className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle quittance
        </Link>
      </div>

      {quittances.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 flex flex-col items-center text-center">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Aucune quittance pour le moment</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-sm">Générez votre première quittance de loyer.</p>
          <Link href="/dashboard/quittances/nouvelle"
            className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
            Créer une quittance
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedMois.map((mois) => {
            const items = grouped.get(mois)!
            return (
              <div key={mois}>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{formatMois(mois)}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {items.map((q) => {
                    const locataire = locatairesMap.get(q.locataire_id)
                    const bien = locataire ? biensMap.get(locataire.bien_id) : null
                    return (
                      <Link key={q.id} href={`/dashboard/quittances/${q.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 block hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{locataire?.nom ?? '—'}</h3>
                            {bien && <p className="text-xs text-slate-400">{bien.nom} — {bien.ville}</p>}
                          </div>
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${q.envoyee ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {q.envoyee ? 'Envoyée' : 'À signer'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-slate-50">
                          <span className="font-bold text-slate-900">{q.total.toLocaleString('fr-FR')} €</span>
                          <span className="text-slate-400 text-xs">{q.loyer_hc.toLocaleString('fr-FR')} HC + {q.charges.toLocaleString('fr-FR')} charges</span>
                        </div>
                        {!q.envoyee && (
                          <div className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium">
                            ✍🏿 Signer et envoyer
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
