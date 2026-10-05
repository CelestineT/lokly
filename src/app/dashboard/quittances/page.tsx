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
  const [filtreMois, setFiltreMois] = useState('')

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

  // Niveau 1 : période. Niveau 2 : bien.
  // On privilégie le bien_id historisé sur la quittance ; le bien actuel du
  // locataire ne sert que de fallback pour les anciennes quittances.
  const grouped = new Map<string, Map<string, Quittance[]>>()
  for (const q of quittances) {
    const locataire = locatairesMap.get(q.locataire_id)
    const bienId = q.bien_id ?? locataire?.bien_id ?? 'sans-bien'
    const byBien = grouped.get(q.mois) ?? new Map<string, Quittance[]>()
    const list = byBien.get(bienId) ?? []
    list.push(q)
    byBien.set(bienId, list)
    grouped.set(q.mois, byBien)
  }

  const sortedMois = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a))
  const moisAffiches = filtreMois ? sortedMois.filter((mois) => mois === filtreMois) : sortedMois

  return (
    <div className="p-6 max-w-6xl mx-auto">
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
          Créer une quittance
        </Link>
      </div>

      {quittances.length > 0 && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {sortedMois.slice(0, 3).map((mois) => (
            <button key={mois} type="button" onClick={() => setFiltreMois(mois)}
              className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${filtreMois === mois ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {formatMois(mois)}
            </button>
          ))}
          <label className="flex-shrink-0 relative">
            <span className="sr-only">Choisir un autre mois</span>
            <input type="month" value={filtreMois} onChange={(e) => setFiltreMois(e.target.value)}
              className="w-[2.35rem] h-[2rem] rounded-full border border-slate-200 bg-white text-transparent px-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              title="Choisir un autre mois" />
          </label>
          {filtreMois && <button type="button" onClick={() => setFiltreMois('')} className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors">Tout voir</button>}
        </div>
      )}

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
        <div className="space-y-10">
          {moisAffiches.map((mois) => {
            const byBien = grouped.get(mois)!
            const sortedBienIds = Array.from(byBien.keys()).sort((a, b) => {
              const ba = biensMap.get(a)
              const bb = biensMap.get(b)
              const la = ba ? `${ba.nom} ${ba.ville}` : 'ZZZ'
              const lb = bb ? `${bb.nom} ${bb.ville}` : 'ZZZ'
              return la.localeCompare(lb, 'fr')
            })

            return (
              <section key={mois}>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                  {formatMois(mois)}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
                  {sortedBienIds.flatMap((bienId) => {
                    const items = byBien.get(bienId)!
                    const bien = biensMap.get(bienId)

                    return items.map((q, index) => {
                      const locataire = locatairesMap.get(q.locataire_id)
                      return (
                        <div key={q.id} className="min-w-0">
                          <div className="flex items-center gap-2 mb-3 min-h-5">
                            <span className="text-slate-400">⌂</span>
                            <h3 className="text-sm font-semibold text-slate-800 truncate">
                              {bien ? `${bien.nom}${bien.ville ? ` — ${bien.ville}` : ''}` : 'Bien non renseigné'}
                            </h3>
                            {index === 0 && items.length > 1 && (
                              <span className="text-xs text-slate-400 whitespace-nowrap">
                                {items.length} quittances
                              </span>
                            )}
                          </div>

                          <Link href={`/dashboard/quittances/${q.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 block hover:shadow-md transition-shadow h-full">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="min-w-0">
                                <h4 className="font-semibold text-slate-900 truncate">{locataire?.nom ?? '—'}</h4>
                                {bien && <p className="text-xs text-slate-400 truncate">{bien.nom} — {bien.ville}</p>}
                              </div>
                              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap ${q.envoyee ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {q.envoyee ? 'Envoyée' : 'À signer'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-sm mt-3 pt-3 border-t border-slate-50">
                              <span className="font-bold text-slate-900 whitespace-nowrap">{q.total.toLocaleString('fr-FR')} €</span>
                              <span className="text-slate-400 text-xs text-right">{q.loyer_hc.toLocaleString('fr-FR')} HC + {q.charges.toLocaleString('fr-FR')} charges</span>
                            </div>
                            {!q.envoyee && (
                              <div className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium">
                                ✍🏿 Signer et envoyer
                              </div>
                            )}
                          </Link>
                        </div>
                      )
                    })
                  })}
                </div>
              </section>
            )
          })}
          {moisAffiches.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
              <p className="text-slate-500 text-sm">Aucune quittance pour ce mois.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
