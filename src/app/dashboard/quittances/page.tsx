import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

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

export default async function QuittancesPage() {
  const supabase = await createClient()

  const [{ data: quittancesData }, { data: locatairesData }, { data: biensData }] =
    await Promise.all([
      supabase.from('quittances').select('*').order('mois', { ascending: false }),
      supabase.from('locataires').select('id, nom, bien_id'),
      supabase.from('biens').select('id, nom, ville'),
    ])

  const quittances: Quittance[] = quittancesData ?? []
  const locataires: Locataire[] = locatairesData ?? []
  const biens: Bien[] = biensData ?? []

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
        <Link
          href="/dashboard/quittances/nouvelle"
          className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle quittance
        </Link>
      </div>

      {quittances.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Aucune quittance pour le moment</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-sm">
            Générez votre première quittance de loyer pour commencer à suivre vos encaissements.
          </p>
          <Link
            href="/dashboard/quittances/nouvelle"
            className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Créer une quittance
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedMois.map((mois) => {
            const items = grouped.get(mois)!
            return (
              <div key={mois}>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  {formatMois(mois)}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {items.map((q) => {
                    const locataire = locatairesMap.get(q.locataire_id)
                    const bien = locataire ? biensMap.get(locataire.bien_id) : null
                    return (
                      <div key={q.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{locataire?.nom ?? '—'}</h3>
                            {bien && <p className="text-xs text-slate-400">{bien.nom} — {bien.ville}</p>}
                          </div>
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${q.envoyee ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {q.envoyee ? 'Envoyée' : 'À envoyer'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-slate-50">
                          <span className="font-bold text-slate-900">{q.total.toLocaleString('fr-FR')} €</span>
                          <span className="text-slate-400 text-xs">
                            {q.loyer_hc.toLocaleString('fr-FR')} HC + {q.charges.toLocaleString('fr-FR')} charges
                          </span>
                        </div>
                      </div>
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