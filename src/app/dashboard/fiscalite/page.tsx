import { createClient } from '@/lib/supabase/server'

const REGIMES = [
  { value: 'micro_foncier', label: 'Micro-foncier', abattement: 30, description: 'Abattement forfaitaire de 30% — revenus fonciers < 15 000 €/an' },
  { value: 'reel', label: 'Réel simplifié', abattement: 0, description: 'Déduction des charges réelles — au-delà de 15 000 €/an ou sur option' },
  { value: 'lmnp_micro', label: 'LMNP micro-BIC', abattement: 50, description: 'Abattement forfaitaire de 50% — location meublée < 77 700 €/an' },
  { value: 'lmnp_reel', label: 'LMNP réel', abattement: 0, description: 'Déduction des charges + amortissement du bien' },
  { value: 'lmp', label: 'LMP', abattement: 0, description: 'Loueur en meublé professionnel — recettes > 23 000 €/an' },
  { value: 'sci', label: 'SCI', abattement: 0, description: 'Société civile immobilière — régime IR ou IS' },
]

const MOIS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

export default async function FiscalitePage() {
  const supabase = await createClient()

  const annee = new Date().getFullYear()

  const [{ data: biensData }, { data: quittancesData }, { data: depensesData }, { data: locatairesData }] =
    await Promise.all([
      supabase.from('biens').select('id, nom, ville, type_location, prix_achat'),
      supabase.from('quittances').select('bien_id, total, mois'),
      supabase.from('depenses').select('bien_id, montant'),
      supabase.from('locataires').select('bien_id, echeance_bail, duree_bail_ans, actif'),
    ])

  const biens = biensData ?? []

  const stats = biens.map(bien => {
    const recettes = (quittancesData ?? [])
      .filter(q => q.bien_id === bien.id && q.mois?.startsWith(String(annee)))
      .reduce((s, q) => s + q.total, 0)

    const charges = (depensesData ?? [])
      .filter(d => d.bien_id === bien.id)
      .reduce((s, d) => s + d.montant, 0)

    const isMeuble = bien.type_location === 'meuble'
    const regimeDefaut = isMeuble ? 'lmnp_micro' : 'micro_foncier'
    const regime = REGIMES.find(r => r.value === regimeDefaut)!
    const abattement = regime.abattement > 0 ? (recettes * regime.abattement) / 100 : 0
    const revenuImposable = Math.max(0, recettes - (regime.abattement > 0 ? abattement : charges))

    const locataire = (locatairesData ?? []).find(l => l.bien_id === bien.id && l.actif)
    let alerteBail: string | null = null
    if (locataire?.echeance_bail) {
      const echeance = new Date(locataire.echeance_bail)
      const maintenant = new Date()
      const diffMois = (echeance.getFullYear() - maintenant.getFullYear()) * 12 + (echeance.getMonth() - maintenant.getMonth())
      if (diffMois <= 3 && diffMois >= 0) {
        alerteBail = `Bail à renouveler dans ${diffMois} mois (${echeance.toLocaleDateString('fr-FR')})`
      } else if (diffMois < 0) {
        alerteBail = `Bail échu depuis le ${echeance.toLocaleDateString('fr-FR')}`
      }
    }

    return { bien, recettes, charges, regime, abattement, revenuImposable, alerteBail }
  })

  const totalRecettes = stats.reduce((s, x) => s + x.recettes, 0)
  const totalCharges = stats.reduce((s, x) => s + x.charges, 0)
  const totalImposable = stats.reduce((s, x) => s + x.revenuImposable, 0)
  const alertes = stats.filter(s => s.alerteBail)

  const moisCourant = new Date().getMonth()
  const moisDeclaration = 4 // mai = index 4
  const joursDeclaration = Math.max(0, Math.round(
    (new Date(annee + (moisCourant >= moisDeclaration ? 1 : 0), moisDeclaration, 20).getTime() - new Date().getTime()) / 86400000
  ))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Fiscalité & Administratif</h1>
        <p className="text-slate-500 text-sm mt-1">Synthèse fiscale {annee} et rappels importants.</p>
      </div>

      {/* Synthèse globale */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Revenus bruts {annee}</p>
          <p className="text-2xl font-bold text-emerald-600">{totalRecettes.toLocaleString('fr-FR')} €</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Charges déductibles</p>
          <p className="text-2xl font-bold text-rose-500">{totalCharges.toLocaleString('fr-FR')} €</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Revenu net imposable estimé</p>
          <p className="text-2xl font-bold text-blue-600">{totalImposable.toLocaleString('fr-FR')} €</p>
        </div>
      </div>

      {/* Rappel déclaration */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-blue-800">Déclaration des revenus fonciers</p>
          <p className="text-sm text-blue-600 mt-0.5">
            Échéance indicative : mai {annee + (moisCourant >= moisDeclaration ? 1 : 0)} — dans environ {joursDeclaration} jours.
            Formulaire 2044 (réel) ou report en 2042 (micro-foncier).
          </p>
        </div>
      </div>

      {/* Alertes baux */}
      {alertes.length > 0 && (
        <div className="space-y-2 mb-6">
          {alertes.map(({ bien, alerteBail }) => (
            <div key={bien.id} className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-800">{bien.nom}</p>
                <p className="text-sm text-amber-600">{alerteBail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Par bien */}
      {stats.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 flex flex-col items-center text-center">
          <p className="text-slate-500 text-sm">Ajoutez des biens pour voir leur situation fiscale.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-800">Détail par bien</h2>
          {stats.map(({ bien, recettes, charges, regime, abattement, revenuImposable }) => (
            <div key={bien.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">{bien.nom}</h3>
                  <p className="text-xs text-slate-400">{bien.ville}</p>
                </div>
                <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  {regime.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4 italic">{regime.description}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Revenus bruts</p>
                  <p className="font-semibold text-emerald-600">{recettes.toLocaleString('fr-FR')} €</p>
                </div>
                {regime.abattement > 0 ? (
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Abattement ({regime.abattement}%)</p>
                    <p className="font-semibold text-slate-600">- {abattement.toLocaleString('fr-FR')} €</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Charges déduites</p>
                    <p className="font-semibold text-rose-500">- {charges.toLocaleString('fr-FR')} €</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Revenu imposable</p>
                  <p className="font-semibold text-blue-600">{revenuImposable.toLocaleString('fr-FR')} €</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Régime conseillé</p>
                  <p className="text-xs text-slate-600 font-medium">
                    {recettes > 15000 && regime.value === 'micro_foncier'
                      ? '⚠️ Passer au réel'
                      : recettes > 77700 && regime.value === 'lmnp_micro'
                      ? '⚠️ Passer au LMNP réel'
                      : '✓ Régime adapté'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}