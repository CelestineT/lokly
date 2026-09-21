import { createClient } from '@/lib/supabase/server'

type Bien = {
  id: string
  nom: string
  ville: string
  prix_achat: number | null
}

export default async function RentabilitePage() {
  const supabase = await createClient()

  const [{ data: biensData }, { data: quittancesData }, { data: depensesData }] =
    await Promise.all([
      supabase.from('biens').select('id, nom, ville, prix_achat').order('nom'),
      supabase.from('quittances').select('bien_id, locataire_id, total, mois'),
      supabase.from('depenses').select('bien_id, montant'),
    ])

  const biens: Bien[] = biensData ?? []

  // Pour chaque bien, calculer recettes et dépenses
  const stats = biens.map((bien) => {
    const recettes = (quittancesData ?? [])
      .filter((q) => q.bien_id === bien.id)
      .reduce((sum, q) => sum + q.total, 0)
    const depenses = (depensesData ?? [])
      .filter((d) => d.bien_id === bien.id)
      .reduce((sum, d) => sum + d.montant, 0)
    const resultat = recettes - depenses
    const rendement = bien.prix_achat && bien.prix_achat > 0
      ? ((recettes / bien.prix_achat) * 100)
      : null
    return { bien, recettes, depenses, resultat, rendement }
  })

  const totalRecettes = stats.reduce((s, x) => s + x.recettes, 0)
  const totalDepenses = stats.reduce((s, x) => s + x.depenses, 0)
  const totalResultat = totalRecettes - totalDepenses

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Rentabilité</h1>
        <p className="text-slate-500 text-sm mt-1">Vue d&apos;ensemble de vos recettes et dépenses par bien.</p>
      </div>

      {/* Totaux */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Recettes totales</p>
          <p className="text-2xl font-bold text-emerald-600">{totalRecettes.toLocaleString('fr-FR')} €</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Dépenses totales</p>
          <p className="text-2xl font-bold text-rose-500">{totalDepenses.toLocaleString('fr-FR')} €</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Résultat net</p>
          <p className={`text-2xl font-bold ${totalResultat >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {totalResultat >= 0 ? '+' : ''}{totalResultat.toLocaleString('fr-FR')} €
          </p>
        </div>
      </div>

      {/* Par bien */}
      {stats.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 flex flex-col items-center text-center">
          <p className="text-slate-500 text-sm">Ajoutez des biens pour voir leur rentabilité.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {stats.map(({ bien, recettes, depenses, resultat, rendement }) => (
            <div key={bien.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">{bien.nom}</h3>
                  <p className="text-xs text-slate-400">{bien.ville}</p>
                </div>
                {rendement !== null && (
                  <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    {rendement.toFixed(2)} % brut
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Recettes</p>
                  <p className="font-semibold text-emerald-600">{recettes.toLocaleString('fr-FR')} €</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Dépenses</p>
                  <p className="font-semibold text-rose-500">{depenses.toLocaleString('fr-FR')} €</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Résultat</p>
                  <p className={`font-semibold ${resultat >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {resultat >= 0 ? '+' : ''}{resultat.toLocaleString('fr-FR')} €
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