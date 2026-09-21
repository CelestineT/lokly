import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type Depense = {
  id: string
  bien_id: string | null
  categorie: string
  montant: number
  date_depense: string
  description: string | null
  deductible_fiscalement: boolean
}

type Bien = { id: string; nom: string; ville: string }

const categorieLabels: Record<string, string> = {
  travaux: 'Travaux', charges: 'Charges', assurance: 'Assurance',
  gestion: 'Gestion', taxe: 'Taxe', autre: 'Autre',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function DepensesPage() {
  const supabase = await createClient()

  const [{ data: depensesData }, { data: biensData }] = await Promise.all([
    supabase.from('depenses').select('*').order('date_depense', { ascending: false }),
    supabase.from('biens').select('id, nom, ville').order('nom'),
  ])

  const depenses: Depense[] = depensesData ?? []
  const biens: Bien[] = biensData ?? []
  const biensMap = new Map(biens.map((b) => [b.id, b]))
  const total = depenses.reduce((sum, d) => sum + d.montant, 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dépenses</h1>
          <p className="text-slate-500 text-sm mt-1">
            {depenses.length} dépense{depenses.length !== 1 ? 's' : ''} · Total : {total.toLocaleString('fr-FR')} €
          </p>
        </div>
        <Link href="/dashboard/depenses/nouvelle" className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle dépense
        </Link>
      </div>

      {depenses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Aucune dépense pour le moment</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-sm">Enregistrez vos dépenses pour suivre la rentabilité de vos biens.</p>
          <Link href="/dashboard/depenses/nouvelle" className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter une dépense
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-50">
            {depenses.map((d) => {
              const bien = d.bien_id ? biensMap.get(d.bien_id) : null
              return (
                <div key={d.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 text-sm">{categorieLabels[d.categorie] ?? d.categorie}</span>
                      {d.deductible_fiscalement && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Déductible</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{d.description ?? '—'}{bien ? ` · ${bien.nom} (${bien.ville})` : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-slate-900 text-sm">{d.montant.toLocaleString('fr-FR')} €</p>
                    <p className="text-xs text-slate-400">{formatDate(d.date_depense)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}