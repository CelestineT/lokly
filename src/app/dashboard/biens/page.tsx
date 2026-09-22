import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type Bien = {
  id: string
  proprietaire_id: string
  nom: string
  adresse: string
  ville: string
  code_postal: string
  type: 'appartement' | 'maison' | 'studio' | 'immeuble' | 'immeuble_rapport' | 'autre'
  type_location: 'meuble' | 'non_meuble'
  surface_m2: number | null
  surface_totale_m2: number | null
  nb_pieces: number | null
  nb_lots: number | null
  prix_achat: number | null
  annexes: string[]
  created_at: string
}

const typeBadge: Record<Bien['type'], { label: string; className: string }> = {
  appartement: { label: 'Appartement', className: 'bg-blue-100 text-blue-700' },
  maison: { label: 'Maison', className: 'bg-green-100 text-green-700' },
  studio: { label: 'Studio', className: 'bg-purple-100 text-purple-700' },
  immeuble: { label: 'Immeuble', className: 'bg-orange-100 text-orange-700' },
  immeuble_rapport: { label: 'Immeuble de rapport', className: 'bg-rose-100 text-rose-700' },
  autre: { label: 'Autre', className: 'bg-slate-100 text-slate-600' },
}

const locationBadge: Record<Bien['type_location'], { label: string; className: string }> = {
  meuble: { label: 'Meublé', className: 'bg-amber-100 text-amber-700' },
  non_meuble: { label: 'Non meublé', className: 'bg-slate-100 text-slate-600' },
}

const ANNEXES_LABELS: Record<string, string> = {
  cave: 'Cave', parking: 'Parking', garage: 'Garage',
  cour: 'Cour', jardin: 'Jardin', grenier: 'Grenier',
  terrasse: 'Terrasse', balcon: 'Balcon',
}

export default async function BiensPage() {
  const supabase = await createClient()
  const { data: biens } = await supabase
    .from('biens')
    .select('*')
    .order('created_at', { ascending: false })

  const liste: Bien[] = biens ?? []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes biens</h1>
          <p className="text-slate-500 text-sm mt-1">
            {liste.length} bien{liste.length !== 1 ? 's' : ''} enregistré{liste.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/dashboard/biens/nouveau"
          className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un bien
        </Link>
      </div>

      {liste.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15v-6h-6v6H3.75A.75.75 0 013 21V9.75z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Aucun bien pour le moment</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-sm">
            Ajoutez votre premier bien immobilier pour commencer à gérer vos locations.
          </p>
          <Link
            href="/dashboard/biens/nouveau"
            className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter votre premier bien
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {liste.map((bien) => {
            const tb = typeBadge[bien.type] ?? { label: bien.type, className: 'bg-slate-100 text-slate-600' }
            const lb = locationBadge[bien.type_location]
            const isImmeuble = bien.type === 'immeuble' || bien.type === 'immeuble_rapport'
            return (
              <div key={bien.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-semibold text-slate-900 text-base leading-snug">{bien.nom}</h3>
                  <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tb.className}`}>{tb.label}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${lb.className}`}>{lb.label}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mb-3">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  {bien.adresse}, {bien.code_postal} {bien.ville}
                </p>
                <div className="flex gap-4 text-sm text-slate-600 mb-3">
                  {isImmeuble && bien.surface_totale_m2 != null && <span>{bien.surface_totale_m2} m² total</span>}
                  {!isImmeuble && bien.surface_m2 != null && <span>{bien.surface_m2} m²</span>}
                  {isImmeuble && bien.nb_lots != null && <span>{bien.nb_lots} lots</span>}
                  {!isImmeuble && bien.nb_pieces != null && <span>{bien.nb_pieces} pièce{bien.nb_pieces !== 1 ? 's' : ''}</span>}
                  {bien.prix_achat != null && <span>{bien.prix_achat.toLocaleString('fr-FR')} €</span>}
                </div>
                {bien.annexes && bien.annexes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {bien.annexes.map(a => (
                      <span key={a} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        {ANNEXES_LABELS[a] ?? a}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                  <Link
                    href={`/dashboard/biens/${bien.id}/modifier`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded-lg px-2.5 py-1.5 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                    Modifier
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