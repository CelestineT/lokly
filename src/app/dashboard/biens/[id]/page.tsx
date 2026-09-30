import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const labels: Record<string,string> = { appartement:'Appartement', maison:'Maison', studio:'Studio', immeuble:'Immeuble', immeuble_rapport:'Immeuble de rapport', parking:'Parking', box:'Box', garage:'Garage', cave:'Cave', local_commercial:'Local commercial', autre:'Autre' }

export default async function BienDetailPage({ params }: { params: Promise<{ id:string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: bien } = await supabase.from('biens').select('*').eq('id', id).single()
  if (!bien) notFound()

  return <div className="p-6 max-w-3xl mx-auto">
    <Link href="/dashboard/biens" className="text-sm text-slate-500">← Retour à mes biens</Link>
    <div className="flex items-start justify-between mt-5 mb-6"><div><h1 className="text-2xl font-bold text-slate-900">{bien.nom}</h1><p className="text-slate-500 mt-1">{bien.adresse}, {bien.code_postal} {bien.ville}</p></div><Link href={`/dashboard/biens/${bien.id}/modifier`} className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm">Modifier</Link></div>
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 grid sm:grid-cols-2 gap-5 text-sm">
      <div><p className="text-slate-400">Type</p><p className="font-medium">{labels[bien.type] ?? bien.type}</p></div>
      {bien.specificite && <div><p className="text-slate-400">Spécificité</p><p className="font-medium">{bien.specificite}</p></div>}
      {bien.type_location && <div><p className="text-slate-400">Location</p><p className="font-medium">{bien.type_location === 'meuble' ? 'Meublé' : bien.type_location === 'non_meuble' ? 'Non meublé' : 'Mixte'}</p></div>}
      {(bien.surface_totale_m2 ?? bien.surface_m2) && <div><p className="text-slate-400">Surface</p><p className="font-medium">{bien.surface_totale_m2 ?? bien.surface_m2} m²</p></div>}
      {bien.nb_pieces && <div><p className="text-slate-400">Nombre de pièces</p><p className="font-medium">{bien.nb_pieces}</p></div>}
      {bien.nb_lots && <div><p className="text-slate-400">Nombre de lots</p><p className="font-medium">{bien.nb_lots}</p></div>}
      {bien.prix_achat && <div><p className="text-slate-400">Prix d'achat</p><p className="font-medium">{Number(bien.prix_achat).toLocaleString('fr-FR')} €</p></div>}
    </div>
  </div>
}
