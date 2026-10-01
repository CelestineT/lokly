import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import DeleteLocataireButton from './DeleteLocataireButton'

type Locataire = { id:string; bien_id:string; bail_id:string|null; est_principal:boolean|null; nom:string; email:string; date_entree:string; loyer_hc:number; charges:number; caution_payee:boolean; created_at:string }
type Bien = { id:string; nom:string; adresse:string; ville:string }
type Bail = { id:string; bien_id:string; lot_id:string|null; type_occupation:string; date_entree:string; loyer_hc:number; charges:number; caution_payee:boolean; created_at:string }
type Lot = { id:string; bien_id:string; numero_lot:string|null; type_lot:string|null; specificite:string|null }

type GroupeOccupation = {
  key:string
  bail:Bail|null
  occupants:Locataire[]
}

export default async function LocatairesPage() {
  const supabase = await createClient()
  const { data: locatairesData } = await supabase.from('locataires').select('*').eq('actif', true).order('created_at', { ascending: false })
  const { data: biensData } = await supabase.from('biens').select('id, nom, adresse, ville')
  const { data: bauxData } = await supabase.from('baux').select('id, bien_id, lot_id, type_occupation, date_entree, loyer_hc, charges, caution_payee, created_at').eq('actif', true)
  const { data: lotsData } = await supabase.from('lots').select('id, bien_id, numero_lot, type_lot, specificite')

  const locataires: Locataire[] = locatairesData ?? []
  const biens: Bien[] = biensData ?? []
  const baux: Bail[] = bauxData ?? []
  const lots: Lot[] = lotsData ?? []
  const biensMap = new Map(biens.map((b) => [b.id, b]))
  const bauxMap = new Map(baux.map((b) => [b.id, b]))
  const lotsMap = new Map(lots.map((l) => [l.id, l]))

  // Une carte représente désormais une occupation/un bail. Les anciens locataires
  // sans bail_id restent affichés individuellement pour préserver la compatibilité.
  const groupesMap = new Map<string, GroupeOccupation>()
  for (const loc of locataires) {
    const key = loc.bail_id ? `bail-${loc.bail_id}` : `loc-${loc.id}`
    const existing = groupesMap.get(key)
    if (existing) existing.occupants.push(loc)
    else groupesMap.set(key, { key, bail: loc.bail_id ? (bauxMap.get(loc.bail_id) ?? null) : null, occupants: [loc] })
  }
  const groupes = Array.from(groupesMap.values())

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes locataires</h1>
          <p className="text-slate-500 text-sm mt-1">{locataires.length} locataire{locataires.length !== 1 ? 's' : ''} actif{locataires.length !== 1 ? 's' : ''} · {groupes.length} occupation{groupes.length !== 1 ? 's' : ''}</p>
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
          {groupes.map((groupe) => {
            const principal = groupe.occupants.find((o) => o.est_principal) ?? groupe.occupants[0]
            const bail = groupe.bail
            const bien = biensMap.get(bail?.bien_id ?? principal.bien_id)
            const lot = bail?.lot_id ? lotsMap.get(bail.lot_id) : undefined
            const typeOccupation = bail?.type_occupation ?? 'individuel'
            const estGroupe = groupe.occupants.length > 1
            const total = bail ? Number(bail.loyer_hc) + Number(bail.charges) : Number(principal.loyer_hc) + Number(principal.charges)
            const cautionPayee = bail ? bail.caution_payee : principal.caution_payee
            const dateSource = bail?.date_entree ?? principal.date_entree
            const dateEntree = new Date(`${dateSource}T00:00:00`).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })
            const titre = estGroupe ? groupe.occupants.map((o) => o.nom).join(' & ') : principal.nom
            const badgeOccupation = typeOccupation === 'bail_commun'
              ? `Bail commun · ${groupe.occupants.length} occupants`
              : typeOccupation === 'colocation'
                ? `Colocation · ${groupe.occupants.length} colocataires`
                : 'Location individuelle'
            const lotLabel = lot
              ? [lot.numero_lot ? `Lot ${lot.numero_lot}` : 'Lot', lot.type_lot, lot.specificite].filter(Boolean).join(' — ')
              : null

            return (
              <div key={groupe.key} className="relative bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <Link href={`/dashboard/locataires/${principal.id}`} className="absolute inset-0 rounded-2xl" aria-label={`Consulter ${titre}`} />
                <div className="flex items-start justify-between gap-3 mb-3 pointer-events-none">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={estGroupe ? 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z' : 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z'} /></svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 text-base">{titre}</h3>
                      <p className="text-xs font-medium text-blue-600 mt-0.5">{badgeOccupation}</p>
                      {estGroupe && <p className="text-xs text-slate-400 mt-1">Locataire principal : {principal.nom}</p>}
                      {!estGroupe && <p className="text-xs text-slate-400">{principal.email}</p>}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0 ${cautionPayee ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{cautionPayee ? 'Caution reçue' : 'Caution en attente'}</span>
                </div>
                {bien && <p className="text-sm text-slate-500 mb-1 pointer-events-none">⌂ {bien.nom} — {bien.ville}</p>}
                {lotLabel && <p className="text-xs text-slate-400 mb-3 pointer-events-none">{lotLabel}</p>}
                <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-slate-50 pointer-events-none">
                  <div><span className="font-semibold text-slate-900">{total.toLocaleString('fr-FR')} € CC</span>{estGroupe && typeOccupation === 'bail_commun' && <span className="block text-[11px] text-slate-400 font-normal">Loyer du bail — compté une seule fois</span>}</div>
                  <span className="text-slate-400">Entrée le {dateEntree}</span>
                </div>
                <div className="relative z-10 mt-3 flex justify-end gap-2">
                  <Link href={`/dashboard/locataires/${principal.id}`} className="inline-flex items-center border border-slate-200 text-slate-600 rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-slate-50">Consulter</Link>
                  <Link href={`/dashboard/locataires/${principal.id}/modifier`} className="inline-flex items-center border border-slate-200 text-slate-600 rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-slate-50">Modifier</Link>
                  {!estGroupe && <DeleteLocataireButton id={principal.id} nom={principal.nom} />}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
