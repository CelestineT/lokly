'use client'
import './paiements.css'
import {propertyLabel} from '@/lib/propertyNames'

import {useRouter} from 'next/navigation'
import PaymentSchedulePanel from './PaymentSchedulePanel'
import {readAllRows} from '@/lib/readAllRows'
import PaymentPeriod from './PaymentPeriod'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatLocataireName } from '@/lib/locataireName'

type Paiement = {
  id: string
  locataire_id: string
  bien_id: string
  mois: string
  montant: number
  caution_recue?:number
  date_paiement: string
  mode_paiement: string
  statut: 'recu' | 'en_retard' | 'partiel'
  solde_anterieur?:number
  commentaire: string | null
}

type Locataire = { id: string; nom: string; civilite:string|null; nom_famille:string|null; prenom:string|null; bien_id: string; qualite_interne?:string|null }
type Bien = { id: string; nom: string; nom_personnalise?: string | null; ville: string }

function formatMois(mois: string): string {
  const [year, month] = mois.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase())
}

function getCurrentMois(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const statutConfig = {
  recu: { label: 'Reçu', class: 'bg-green-100 text-green-700' },
  partiel: { label: 'Partiel', class: 'bg-blue-100 text-blue-700' },
  en_retard: { label: 'À payer', class: 'bg-red-100 text-red-700' },
}

export default function PaiementsPage() {
  const router=useRouter()
  const [paiements, setPaiements] = useState<Paiement[]>([])
  const [locataires, setLocataires] = useState<Locataire[]>([])
  const [biens, setBiens] = useState<Bien[]>([])
  const [loading, setLoading] = useState(true)
  const [filtreMois, setFiltreMois] = useState(getCurrentMois())
  const [recherche,setRecherche] = useState('')
  const [bienFiltre,setBienFiltre] = useState('')
  const [statutFiltre,setStatutFiltre] = useState('')
  const [revision,setRevision]=useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    try {
      const [p,l,b] = await Promise.all(['paiements','locataires','biens'].map(t=>readAllRows(supabase.from(t).select('*'))))
      setPaiements(p.data);setLocataires(l.data);setBiens(b.data)
    } catch {setError('Impossible de charger tous les paiements. Réessayez.')}
    finally {setLoading(false)}
  }

  async function annulerPaiement(p: Paiement) {
    if (!window.confirm(`Annuler le paiement de ${p.montant.toLocaleString('fr-FR')} € ?\n\nCette action supprimera ce paiement de l’historique et recalculera le total reçu.`)) return
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from('paiements').delete().eq('id', p.id)
    if (err) { setError(err.message); return }
    setPaiements((prev) => prev.filter((x) => x.id !== p.id))
    setRevision(v=>v+1)
  }

  const locatairesMap = new Map(locataires.map((l) => [l.id, l]))
  const biensMap = new Map(biens.map((b) => [b.id, b]))
  const paiementsFiltres = filtreMois ? paiements.filter((p) => p.mois.startsWith(filtreMois)) : [...paiements]
  const matchingPaiements=paiementsFiltres.filter(p=>{const l=locatairesMap.get(p.locataire_id),b=biensMap.get(p.bien_id)??(l?biensMap.get(l.bien_id):undefined),text=`${formatLocataireName(l,'')} ${b?.nom??''} ${b?.ville??''}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),q=recherche.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return (!q||text.includes(q))&&(!bienFiltre||b?.id===bienFiltre)&&(!statutFiltre||p.statut===statutFiltre)})
  matchingPaiements.sort((a,b)=>b.mois.localeCompare(a.mois)||(biensMap.get(a.bien_id)?.nom??'').localeCompare(biensMap.get(b.bien_id)?.nom??'','fr')||formatLocataireName(locatairesMap.get(a.locataire_id),'').localeCompare(formatLocataireName(locatairesMap.get(b.locataire_id),''),'fr')||String(b.date_paiement??'').localeCompare(String(a.date_paiement??''))||a.id.localeCompare(b.id))
  const totalRecu = matchingPaiements.filter((p) => p.statut === 'recu' || p.statut === 'partiel').reduce((sum, p) => sum + Number(p.montant??0) + Number(p.caution_recue??0), 0)
  const moisDisponibles = Array.from(new Set(paiements.map((p) => p.mois))).sort((a, b) => b.localeCompare(a))
  if (!moisDisponibles.includes(getCurrentMois())) moisDisponibles.unshift(getCurrentMois())


  return (
    <div className="paiements-ui max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div><h1 className="text-2xl font-bold text-slate-900">Paiements loyers</h1><p className="text-slate-500 text-sm mt-1">Suivez les échéances et les règlements de vos baux.</p></div>
        <Link href="/dashboard/paiements/nouveau" className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Enregistrer un paiement
        </Link>
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">{error}</div>}

      <PaymentPeriod months={moisDisponibles} value={filtreMois} onChange={setFiltreMois}/>
      <div className="paiements-filters"><input aria-label="Rechercher un locataire ou un bien" placeholder="Rechercher un locataire ou un bien" value={recherche} onChange={e=>setRecherche(e.target.value)}/><select aria-label="Filtrer par bien" value={bienFiltre} onChange={e=>setBienFiltre(e.target.value)}><option value="">Tous les biens</option>{biens.map(b=><option key={b.id} value={b.id}>{propertyLabel(b)}</option>)}</select><select aria-label="Filtrer par statut" value={statutFiltre} onChange={e=>setStatutFiltre(e.target.value)}><option value="">Tous les statuts</option><option value="recu">Reçu</option><option value="partiel">Partiel</option><option value="en_retard">À payer</option></select></div>
      <PaymentSchedulePanel month={filtreMois} recherche={recherche} bienFiltre={bienFiltre} statutFiltre={statutFiltre} revision={revision}/>
      <details id="payments-history" className="payments-history"><summary>Historique des paiements enregistrés</summary>
      <p className="payments-history-total">Total encaissé sur la sélection, caution comprise : <strong>{totalRecu.toLocaleString('fr-FR')} €</strong></p>
      <div className="min-w-0">

      {loading ? <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div> : matchingPaiements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center text-center"><h2 className="text-lg font-semibold text-slate-800 mb-2">Aucun paiement enregistré</h2><p className="text-slate-500 text-sm mb-6">Enregistrez le premier paiement de loyer.</p><Link href="/dashboard/paiements/nouveau" className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium">Enregistrer un paiement</Link></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
          {matchingPaiements.map((p,index) => {
            const locataire = locatairesMap.get(p.locataire_id)
            const bien = biensMap.get(p.bien_id) ?? (locataire ? biensMap.get(locataire.bien_id) : undefined)
            const statut = Number(p.montant)===0&&Number(p.caution_recue??0)===0?statutConfig.en_retard:statutConfig[p.statut]
            const datePaiement = new Date(p.date_paiement).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
            return <div key={p.id}>{(index===0||matchingPaiements[index-1].mois!==p.mois)&&<h2 className="px-4 py-2 bg-slate-50 text-sm font-semibold">{formatMois(p.mois)}</h2>}<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-4">
              <div><p className="font-medium text-slate-900 text-sm">{formatLocataireName(locataire, '—')}</p><p className="text-xs text-slate-400">{bien ? `${propertyLabel(bien)} · ` : ''}{formatMois(p.mois)} · {datePaiement}</p>{Number(p.montant)===0&&<p className="text-xs text-amber-700 mt-1">Loyer du mois non payé</p>}{Number(p.solde_anterieur??0)>0&&<p className="text-xs text-amber-700">Solde antérieur : {Number(p.solde_anterieur).toLocaleString('fr-FR')} €</p>}{Number(p.caution_recue??0)>0&&<p className="text-xs text-slate-500">Caution encaissée : {Number(p.caution_recue).toLocaleString('fr-FR')} €</p>}{p.commentaire && <p className="text-xs text-slate-400 italic mt-0.5">{p.commentaire}</p>}</div>
              <div className="flex items-center gap-3 flex-shrink-0"><span className="font-bold text-slate-900 text-sm">{(Number(p.montant??0)+Number(p.caution_recue??0)).toLocaleString('fr-FR')} €</span><span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statut.class}`}>{statut.label}</span><div className="flex items-center gap-1 ml-1"><button type="button" onClick={() => router.push(`/dashboard/paiements/nouveau?modifier=${encodeURIComponent(p.id)}`)} title="Modifier le paiement" className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.5-8.5a2.121 2.121 0 013 3L12 16l-4 1 1-4 8.5-8.5z" /></svg></button><button type="button" onClick={() => annulerPaiement(p)} title="Annuler le paiement" className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div></div>
            </div></div>
          })}
        </div>
      )}

      </div></details>

    </div>
  )
}
