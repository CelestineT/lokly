import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import DeleteLocataireButton from './DeleteLocataireButton'

type Locataire = { id:string; bien_id:string; nom:string; email:string; date_entree:string; loyer_hc:number; charges:number; caution_payee:boolean; created_at:string }
type Bien = { id:string; nom:string; adresse:string; ville:string }

export default async function LocatairesPage() {
  const supabase = await createClient()
  const { data: locatairesData } = await supabase.from('locataires').select('*').eq('actif', true).order('created_at', { ascending: false })
  const { data: biensData } = await supabase.from('biens').select('id, nom, adresse, ville')
  const locataires: Locataire[] = locatairesData ?? []
  const biens: Bien[] = biensData ?? []
  const biensMap = new Map(biens.map((b) => [b.id, b]))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes locataires</h1>
          <p className="text-slate-500 text-sm mt-1">{locataires.length} locataire{locataires.length !== 1 ? 's' : ''} actif{locataires.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/locataires/nouveau" className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">+ Ajouter un locataire</Link>
      </div>

      {locataires.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Aucun locataire pour le moment</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-sm">Ajoutez votre premier locataire pour commencer à suivre vos locations.</p>
          <Link href="/dashboard/locataires/nouveau" className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">Ajouter votre premier locataire</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {locataires.map((loc) => {
            const bien = biensMap.get(loc.bien_id)
            const total = Number(loc.loyer_hc) + Number(loc.charges)
            const dateEntree = new Date(`${loc.date_entree}T00:00:00`).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })
            return (
              <div key={loc.id} className="relative bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <Link href={`/dashboard/locataires/${loc.id}`} className="absolute inset-0 rounded-2xl" aria-label={`Consulter ${loc.nom}`} />
                <div className="flex items-start justify-between gap-3 mb-3 pointer-events-none">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0"><svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg></div>
                    <div><h3 className="font-semibold text-slate-900 text-base">{loc.nom}</h3><p className="text-xs text-slate-400">{loc.email}</p></div>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0 ${loc.caution_payee ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{loc.caution_payee ? 'Caution reçue' : 'Caution en attente'}</span>
                </div>
                {bien && <p className="text-sm text-slate-500 mb-3 pointer-events-none">⌂ {bien.nom} — {bien.ville}</p>}
                <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-slate-50 pointer-events-none"><span className="font-semibold text-slate-900">{total.toLocaleString('fr-FR')} € CC</span><span className="text-slate-400">Entrée le {dateEntree}</span></div>
                <div className="relative z-10 mt-3 flex justify-end gap-2">
                  <Link href={`/dashboard/locataires/${loc.id}`} className="inline-flex items-center border border-slate-200 text-slate-600 rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-slate-50">Consulter</Link>
                  <Link href={`/dashboard/locataires/${loc.id}/modifier`} className="inline-flex items-center border border-slate-200 text-slate-600 rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-slate-50">Modifier</Link>
                  <DeleteLocataireButton id={loc.id} nom={loc.nom} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
