'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Paiement = {
  id: string
  locataire_id: string
  bien_id: string
  mois: string
  montant: number
  date_paiement: string
  mode_paiement: string
  statut: 'recu' | 'en_retard' | 'partiel'
  commentaire: string | null
}

type Locataire = { id: string; nom: string; bien_id: string }
type Bien = { id: string; nom: string; ville: string }

function formatMois(mois: string): string {
  const [year, month] = mois.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    .replace(/^./, (c) => c.toUpperCase())
}

function getCurrentMois(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const statutConfig = {
  recu: { label: 'Reçu', class: 'bg-green-100 text-green-700' },
  partiel: { label: 'Partiel', class: 'bg-blue-100 text-blue-700' },
  en_retard: { label: 'En retard', class: 'bg-red-100 text-red-700' },
}

export default function PaiementsPage() {
  const [paiements, setPaiements] = useState<Paiement[]>([])
  const [locataires, setLocataires] = useState<Locataire[]>([])
  const [biens, setBiens] = useState<Bien[]>([])
  const [loading, setLoading] = useState(true)
  const [filtreMois, setFiltreMois] = useState(getCurrentMois())

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('paiements').select('*').order('date_paiement', { ascending: false }),
      supabase.from('locataires').select('id, nom, bien_id'),
      supabase.from('biens').select('id, nom, ville'),
    ]).then(([{ data: p }, { data: l }, { data: b }]) => {
      if (p) setPaiements(p)
      if (l) setLocataires(l)
      if (b) setBiens(b)
      setLoading(false)
    })
  }, [])

  const locatairesMap = new Map(locataires.map((l) => [l.id, l]))
  const biensMap = new Map(biens.map((b) => [b.id, b]))

  const paiementsFiltres = filtreMois
    ? paiements.filter((p) => p.mois === filtreMois)
    : paiements

  const totalRecu = paiementsFiltres
    .filter((p) => p.statut === 'recu' || p.statut === 'partiel')
    .reduce((sum, p) => sum + p.montant, 0)

  const enRetard = paiementsFiltres.filter((p) => p.statut === 'en_retard').length

  // Générer les mois disponibles
  const moisDisponibles = Array.from(new Set(paiements.map((p) => p.mois))).sort((a, b) => b.localeCompare(a))
  if (!moisDisponibles.includes(getCurrentMois())) {
    moisDisponibles.unshift(getCurrentMois())
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historique des paiements</h1>
          <p className="text-slate-500 text-sm mt-1">
            {paiementsFiltres.length} paiement{paiementsFiltres.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/dashboard/paiements/nouveau"
          className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Enregistrer un paiement
        </Link>
      </div>

      {/* Résumé du mois */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-400">Total reçu</p>
            <p className="text-lg font-bold text-slate-900">{totalRecu.toLocaleString('fr-FR')} €</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${enRetard > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
            <svg className={`w-5 h-5 ${enRetard > 0 ? 'text-red-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-400">En retard</p>
            <p className={`text-lg font-bold ${enRetard > 0 ? 'text-red-600' : 'text-slate-900'}`}>{enRetard}</p>
          </div>
        </div>
      </div>

      {/* Filtre par mois */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {moisDisponibles.slice(0, 6).map((m) => (
          <button key={m} onClick={() => setFiltreMois(m)}
            className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${filtreMois === m ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {formatMois(m)}
          </button>
        ))}
        {filtreMois && (
          <button onClick={() => setFiltreMois('')}
            className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors">
            Tout voir
          </button>
        )}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : paiementsFiltres.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center text-center">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Aucun paiement enregistré</h2>
          <p className="text-slate-500 text-sm mb-6">Enregistrez le premier paiement de loyer.</p>
          <Link href="/dashboard/paiements/nouveau"
            className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
            Enregistrer un paiement
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
          {paiementsFiltres.map((p) => {
            const locataire = locatairesMap.get(p.locataire_id)
            const bien = locataire ? biensMap.get(locataire.bien_id) : null
            const statut = statutConfig[p.statut]
            const datePaiement = new Date(p.date_paiement).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
            return (
              <div key={p.id} className="flex items-center justify-between px-5 py-4 first:rounded-t-2xl last:rounded-b-2xl">
                <div>
                  <p className="font-medium text-slate-900 text-sm">{locataire?.nom ?? '—'}</p>
                  <p className="text-xs text-slate-400">
                    {bien ? `${bien.nom} · ` : ''}{formatMois(p.mois)} · {datePaiement}
                  </p>
                  {p.commentaire && <p className="text-xs text-slate-400 italic mt-0.5">{p.commentaire}</p>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-bold text-slate-900 text-sm">{p.montant.toLocaleString('fr-FR')} €</span>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statut.class}`}>
                    {statut.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
