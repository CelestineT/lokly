import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import DeleteLocataireButton from './DeleteLocataireButton'

type Locataire = { id:string; bien_id:string; bail_id:string|null; est_principal:boolean|null; nom:string; email:string; date_entree:string; date_sortie:string|null; loyer_hc:number; charges:number; caution_payee:boolean; actif:boolean; created_at:string }
type Bien = { id:string; nom:string; adresse:string; ville:string }
type Bail = { id:string; bien_id:string; lot_id:string|null; type_occupation:string; date_entree:string; date_sortie:string|null; loyer_hc:number; charges:number; caution_payee:boolean; actif:boolean; created_at:string }
type Lot = { id:string; bien_id:string; numero_lot:string|null; type_lot:string|null; specificite:string|null }
type GroupeOccupation = { key:string; bail:Bail|null; occupants:Locataire[] }

export default async function LocatairesPage() {
  const supabase = await createClient()
  const { data: locatairesData } = await supabase.from('locataires').select('*').order('created_at', { ascending: false })
  const { data: biensData } = await supabase.from('biens').select('id, nom, adresse, ville')
  const { data: bauxData } = await supabase.from('baux').select('id, bien_id, lot_id, type_occupation, date_entree, date_sortie, loyer_hc, charges, caution_payee, actif, created_at')
  const { data: lotsData } = await supabase.from('lots').select('id, bien_id, numero_lot, type_lot, specificite')

  const locataires: Locataire[] = locatairesData ?? []
  const biens: Bien[] = biensData ?? []
  const baux: Bail[] = bauxData ?? []
  const lots: Lot[] = lotsData ?? []
  const biensMap = new Map(biens.map((b) => [b.id, b]))
  const bauxMap = new Map(baux.map((b) => [b.id, b]))
  const lotsMap = new Map(lots.map((l) => [l.id, l]))

  const groupesMap = new Map<string, GroupeOccupation>()
  for (const loc of locataires) {
    const key = loc.bail_id ? `bail-${loc.bail_id}` : `loc-${loc.id}`
    const existing = groupesMap.get(key)
    if (existing) existing.occupants.push(loc)
    else groupesMap.set(key, { key, bail: loc.bail_id ? (bauxMap.get(loc.bail_id) ?? null) : null, occupants: [loc] })
  }
  const groupes = Array.from(groupesMap.values())
  const groupesActifs = groupes.filter((g) => g.occupants.some((o) => o.actif))
  const groupesTermines = groupes.filter((g) => !g.occupants.some((o) => o.actif))
  const nbActifs = locataires.filter((l) => l.actif).length

  function renderGroupe(groupe: GroupeOccupation, termine = false) {
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
    const dateSortieSource = bail?.date_sortie ?? principal.date_sortie
    const dateSortie = dateSortieSource ? new Date(`${dateSortieSource}T00:00:00`).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }) : null
    const titre = estGroupe ? groupe.occupants.map((o) => o.nom).join(' & ') : principal.nom
    const badgeOccupation = typeOccupation === 'bail_commun' ? `Bail commun · ${groupe.occupants.length} occupants` : typeOccupation === 'colocation' ? `Colocation · ${groupe.occupants.length} colocataires` : 'Location individuelle'
    const lotLabel = lot ? [lot.numero_lot ? `Lot ${lot.numero_lot}` : 'Lot', lot.type_lot, lot.specificite].filter(Boolean).join(' — ') : null
    const ficheHref = `/dashboard/locataires/${principal.id}`

    return (
      <div key={groupe.key} className="relative bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
        <Link href={ficheHref} className="absolute inset-0 rounded-2xl" aria-label={`Consulter ${titre}`} />
        <div className="flex items-start justify-between gap-3 mb-3 pointer-events-none">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-900 text-base">{titre}</h3>
              {termine && <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">Bail terminé</span>}
            </div>
            <p className="text-xs font-medium text-blue-600 mt-0.5">{badgeOccupation}</p>
            {estGroupe ? <p className="text-xs text-slate-400 mt-1">Locataire principal : {principal.nom}</p> : <p className="text-xs text-slate-400">{principal.email}</p>}
          </div>
          {!termine && <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0 ${cautionPayee ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{cautionPayee ? 'Caution reçue' : 'Caution en attente'}</span>}
        </div>
        {bien && <p className="text-sm text-slate-500 mb-1 pointer-events-none">⌂ {bien.nom} — {bien.ville}</p>}
        {lotLabel && <p className="text-xs text-slate-400 mb-3 pointer-events-none">{lotLabel}</p>}
        <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-slate-50 pointer-events-none">
          <div><span className="font-semibold text-slate-900">{total.toLocaleString('fr-FR')} € CC</span>{estGroupe && typeOccupation === 'bail_commun' && <span className="block text-[11px] text-slate-400 font-normal">Loyer du bail — compté une seule fois</span>}</div>
          <span className="text-slate-400">{termine && dateSortie ? `Sortie le ${dateSortie}` : `Entrée le ${dateEntree}`}</span>
        </div>
        <div className="relative z-10 mt-3 flex justify-end gap-2">
          <Link href={ficheHref} className="inline-flex items-center border border-slate-200 text-slate-600 rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-slate-50">Consulter</Link>
          {!estGroupe && <Link href={`/dashboard/locataires/${principal.id}/modifier`} className="inline-flex items-center border border-slate-200 text-slate-600 rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-slate-50">Modifier</Link>}
          {!estGroupe && <DeleteLocataireButton id={principal.id} nom={principal.nom} />}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes locataires</h1>
          <p className="text-slate-500 text-sm mt-1">{nbActifs} locataire{nbActifs !== 1 ? 's' : ''} actif{nbActifs !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/locataires/nouveau" className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">+ Ajouter un locataire</Link>
      </div>

      {groupesActifs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Aucun locataire actif</h2>
          <p className="text-slate-500 text-sm">Les anciens locataires restent accessibles dans l’historique ci-dessous.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 mb-10">{groupesActifs.map((g) => renderGroupe(g))}</div>
      )}

      {groupesTermines.length > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Résiliations et fins de bail</h2>
            <p className="text-sm text-slate-500 mt-1">Historique des locataires dont la location est terminée.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">{groupesTermines.map((g) => renderGroupe(g, true))}</div>
        </section>
      )}
    </div>
  )
}
