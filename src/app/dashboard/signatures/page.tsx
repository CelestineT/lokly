import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type Quittance = {
  id: string
  locataire_id: string
  mois: string
  loyer_hc: number
  charges: number
  solde: number
  total: number
  date_signature: string
  envoyee: boolean
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
}

function formatMois(mois: string): string {
  const [year, month] = mois.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    .replace(/^./, (c) => c.toUpperCase())
}

export default async function SignaturesPage() {
  const supabase = await createClient()

  const [{ data: quittancesData }, { data: locatairesData }, { data: biensData }] =
    await Promise.all([
      supabase.from('quittances').select('*').order('mois', { ascending: false }),
      supabase.from('locataires').select('id, nom, email, bien_id'),
      supabase.from('biens').select('id, nom, adresse, ville'),
    ])

  const quittances: Quittance[] = quittancesData ?? []
  const locataires: Locataire[] = locatairesData ?? []
  const biens: Bien[] = biensData ?? []

  const locatairesMap = new Map(locataires.map((l) => [l.id, l]))
  const biensMap = new Map(biens.map((b) => [b.id, b]))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Documents & Signatures</h1>
        <p className="text-slate-500 text-sm mt-1">
          Générez et envoyez vos quittances de loyer en PDF.
        </p>
      </div>

      {quittances.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Aucune quittance disponible</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-sm">
            Créez d'abord des quittances pour pouvoir les générer en PDF.
          </p>
          <Link
            href="/dashboard/quittances/nouvelle"
            className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Créer une quittance
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {quittances.map((q) => {
            const locataire = locatairesMap.get(q.locataire_id)
            const bien = locataire ? biensMap.get(locataire.bien_id) : null
            return (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{locataire?.nom ?? '—'}</p>
                    <p className="text-xs text-slate-400">
                      {formatMois(q.mois)}{bien ? ` — ${bien.ville}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">{q.total.toLocaleString('fr-FR')} €</span>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                    q.envoyee ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {q.envoyee ? 'Envoyée' : 'À envoyer'}
                  </span>
                  <Link
                    href={`/dashboard/signatures/${q.id}`}
                    className="inline-flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Générer PDF
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}