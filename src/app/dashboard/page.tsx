import { createClient } from '@/lib/supabase/server'
import type { Bien, Locataire, Quittance, Depense, Alerte } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [biensRes, locatairesRes, quittancesRes, depensesRes, alertesRes] = await Promise.all([
    supabase.from('biens').select('*').order('created_at', { ascending: false }),
    supabase.from('locataires').select('*').eq('actif', true),
    supabase.from('quittances').select('*').order('created_at', { ascending: false }).limit(10),
    supabase.from('depenses').select('*'),
    supabase.from('alertes').select('*').eq('lue', false).order('created_at', { ascending: false }),
  ])

  const biens: Bien[] = biensRes.data ?? []
  const locataires: Locataire[] = locatairesRes.data ?? []
  const quittances: Quittance[] = quittancesRes.data ?? []
  const depenses: Depense[] = depensesRes.data ?? []
  const alertes: Alerte[] = alertesRes.data ?? []

  // Calculs KPIs
  const loyersMensuels = locataires.reduce((s, l) => s + l.loyer_hc + l.charges, 0)
  const depensesTotales = depenses.reduce((s, d) => s + d.montant, 0)
  const quittancesNonEnvoyees = quittances.filter(q => !q.envoyee).length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-slate-900">Tableau de bord</h1>
        <p className="text-sm text-slate-500 mt-0.5">Vue d'ensemble de votre patrimoine</p>
      </div>

      {/* Alertes */}
      {alertes.length > 0 && (
        <div className="mb-6 space-y-2">
          {alertes.slice(0, 3).map(a => (
            <div key={a.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${
              a.niveau === 'danger' ? 'bg-red-50 border-red-100 text-red-800' :
              a.niveau === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-800' :
              'bg-blue-50 border-blue-100 text-blue-800'
            }`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {a.message}
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Biens"
          value={biens.length.toString()}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
        />
        <KpiCard
          label="Locataires actifs"
          value={locataires.length.toString()}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <KpiCard
          label="Loyers / mois"
          value={`${loyersMensuels.toFixed(0)} €`}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
          accent
        />
        <KpiCard
          label="Quittances à envoyer"
          value={quittancesNonEnvoyees.toString()}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
        />
      </div>

      {/* Contenu principal */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Dernières quittances */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-display font-semibold text-slate-900 mb-4">Dernières quittances</h2>
          {quittances.length === 0 ? (
            <EmptyState text="Aucune quittance générée" />
          ) : (
            <div className="space-y-2">
              {quittances.slice(0, 5).map(q => (
                <div key={q.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{q.mois}</p>
                    <p className="text-xs text-slate-400">{q.total} €</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    q.envoyee ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {q.envoyee ? 'Envoyée' : 'À envoyer'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Locataires actifs */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-display font-semibold text-slate-900 mb-4">Locataires actifs</h2>
          {locataires.length === 0 ? (
            <EmptyState text="Aucun locataire enregistré" />
          ) : (
            <div className="space-y-2">
              {locataires.slice(0, 5).map(l => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{l.nom}</p>
                    <p className="text-xs text-slate-400">{l.mode_paiement}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{(l.loyer_hc + l.charges).toFixed(0)} €</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, icon, accent }: {
  label: string; value: string; icon: React.ReactNode; accent?: boolean
}) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'bg-blue-600 border-blue-500' : 'bg-white border-slate-100'} shadow-sm`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${accent ? 'bg-white/20 text-green-300' : 'bg-blue-50 text-blue-600'}`}>
        {icon}
      </div>
      <p className={`text-2xl font-display font-bold ${accent ? 'text-white' : 'text-slate-900'}`}>{value}</p>
      <p className={`text-xs mt-0.5 ${accent ? 'text-white/70' : 'text-slate-500'}`}>{label}</p>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-8 text-sm text-slate-400">{text}</div>
  )
}
