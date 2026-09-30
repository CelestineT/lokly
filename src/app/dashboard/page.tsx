'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Quittance = {
  id: string
  locataire_id: string
  mois: string
  total: number
  envoyee: boolean
}

type Locataire = { id: string; nom: string }
type Bien = { id: string; type: string }
type Lot = { id: string; type: string }

const TYPES_LOGEMENT_BIEN = new Set(['appartement', 'maison', 'studio'])
const TYPES_LOGEMENT_LOT = new Set(['appartement', 'studio'])
const TYPES_HORS_LOGEMENT = new Set(['parking', 'box', 'garage', 'cave', 'local_commercial', 'local-commercial', 'local commercial'])

function formatMois(mois: string): string {
  const [year, month] = mois.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    .replace(/^./, (c) => c.toUpperCase())
}

function getCurrentMois(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export default function DashboardPage() {
  const [logements, setLogements] = useState(0)
  const [biensHorsLogement, setBiensHorsLogement] = useState(0)
  const [locataires, setLocataires] = useState(0)
  const [quittances, setQuittances] = useState<Quittance[]>([])
  const [locatairesMap, setLocatairesMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)

  const moisCourant = getCurrentMois()

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('biens').select('id,type'),
      supabase.from('lots').select('id,type'),
      supabase.from('locataires').select('id', { count: 'exact', head: true }).eq('actif', true),
      supabase.from('quittances').select('id, locataire_id, mois, total, envoyee').order('mois', { ascending: false }).limit(20),
      supabase.from('locataires').select('id, nom'),
    ]).then(([biensRes, lotsRes, locatairesRes, quittancesRes, locatairesData]) => {
      const biens = (biensRes.data ?? []) as Bien[]
      const lots = (lotsRes.data ?? []) as Lot[]

      // Un immeuble de rapport est un contenant : ses logements sont comptés via ses lots,
      // afin de ne pas compter l'immeuble lui-même comme un logement supplémentaire.
      setLogements(
        biens.filter((b) => TYPES_LOGEMENT_BIEN.has(b.type)).length +
        lots.filter((l) => TYPES_LOGEMENT_LOT.has(l.type)).length
      )

      // Les biens hors logements correspondent aux unités exploitables séparément
      // (box, parking, garage, cave, local commercial), qu'elles soient autonomes ou en lot.
      setBiensHorsLogement(
        biens.filter((b) => TYPES_HORS_LOGEMENT.has(b.type)).length +
        lots.filter((l) => TYPES_HORS_LOGEMENT.has(l.type)).length
      )

      setLocataires(locatairesRes.count ?? 0)
      if (quittancesRes.data) setQuittances(quittancesRes.data)
      if (locatairesData.data) {
        setLocatairesMap(new Map((locatairesData.data as Locataire[]).map((l) => [l.id, l.nom])))
      }
      setLoading(false)
    })
  }, [])

  const quittancesMois = quittances.filter((q) => q.mois === moisCourant)
  const totalMois = quittancesMois.reduce((sum, q) => sum + q.total, 0)
  const aEnvoyer = quittancesMois.filter((q) => !q.envoyee).length
  const tauxEnvoi = quittancesMois.length > 0
    ? Math.round((quittancesMois.filter((q) => q.envoyee).length / quittancesMois.length) * 100)
    : 0

  const dernieresQuittances = quittances.slice(0, 5)

  const kpis = [
    {
      label: 'Logements',
      value: loading ? '…' : String(logements),
      href: '/dashboard/biens',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Biens hors logements',
      value: loading ? '…' : String(biensHorsLogement),
      href: '/dashboard/biens',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M5 7l1 13h12l1-13M9 11v5m6-5v5" />
        </svg>
      ),
      color: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Locataires actifs',
      value: loading ? '…' : String(locataires),
      href: '/dashboard/locataires',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'bg-violet-50 text-violet-600',
    },
    {
      label: `Loyers ${formatMois(moisCourant)}`,
      value: loading ? '…' : `${totalMois.toLocaleString('fr-FR')} €`,
      href: '/dashboard/paiements',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Quittances à envoyer',
      value: loading ? '…' : String(aEnvoyer),
      href: '/dashboard/quittances',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      color: aEnvoyer > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400',
    },
    {
      label: 'Taux d\'envoi ce mois',
      value: loading ? '…' : `${tauxEnvoi} %`,
      href: '/dashboard/quittances',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: tauxEnvoi === 100 ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-500',
    },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-slate-500 text-sm mt-1">{formatMois(moisCourant)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.color}`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">{kpi.label}</p>
              <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
            </div>
          </Link>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Dernières quittances</h2>
          <Link href="/dashboard/quittances" className="text-xs text-blue-600 hover:underline">
            Voir tout →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : dernieresQuittances.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
            <p className="text-slate-400 text-sm">Aucune quittance pour le moment</p>
            <Link href="/dashboard/quittances/nouvelle"
              className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors mt-4">
              Créer une quittance
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
            {dernieresQuittances.map((q) => (
              <Link key={q.id} href={`/dashboard/quittances/${q.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors first:rounded-t-2xl last:rounded-b-2xl">
                <div>
                  <p className="font-medium text-slate-900 text-sm">{locatairesMap.get(q.locataire_id) ?? '—'}</p>
                  <p className="text-xs text-slate-400">{formatMois(q.mois)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900 text-sm">{q.total.toLocaleString('fr-FR')} €</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${q.envoyee ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {q.envoyee ? 'Envoyée' : 'À envoyer'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
