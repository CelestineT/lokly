import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DeleteLocataireButton from '../DeleteLocataireButton'

function dateFr(value: string | null) {
  if (!value) return '—'
  return new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR')
}

export default async function LocataireDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: locataire } = await supabase.from('locataires').select('*').eq('id', id).single()
  if (!locataire) notFound()

  const { data: bien } = locataire.bien_id
    ? await supabase.from('biens').select('nom, adresse, ville, code_postal').eq('id', locataire.bien_id).single()
    : { data: null }

  const total = Number(locataire.loyer_hc ?? 0) + Number(locataire.charges ?? 0)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/locataires" className="text-slate-400 hover:text-slate-600 mt-1">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{locataire.nom}</h1>
            <p className="text-sm text-slate-500 mt-1">{locataire.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/locataires/${id}/modifier`}
            className="border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-sm font-medium hover:bg-slate-50">
            Modifier
          </Link>
          <DeleteLocataireButton id={id} nom={locataire.nom} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Identité</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div><p className="text-slate-400">Email</p><p className="font-medium text-slate-900">{locataire.email}</p></div>
            <div><p className="text-slate-400">Téléphone</p><p className="font-medium text-slate-900">{locataire.telephone || '—'}</p></div>
          </div>
        </section>

        <hr className="border-slate-100" />
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Bien loué</h2>
          <p className="font-medium text-slate-900">{bien?.nom ?? '—'}</p>
          {bien && <p className="text-sm text-slate-500">{bien.adresse}, {bien.code_postal} {bien.ville}</p>}
        </section>

        <hr className="border-slate-100" />
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Bail</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div><p className="text-slate-400">Date d'entrée</p><p className="font-medium">{dateFr(locataire.date_entree)}</p></div>
            <div><p className="text-slate-400">Date de sortie</p><p className="font-medium">{dateFr(locataire.date_sortie)}</p></div>
            <div><p className="text-slate-400">Durée du bail</p><p className="font-medium">{locataire.duree_bail_ans ? `${locataire.duree_bail_ans} an${locataire.duree_bail_ans > 1 ? 's' : ''}` : '—'}</p></div>
            <div><p className="text-slate-400">Mode de paiement</p><p className="font-medium capitalize">{locataire.mode_paiement || '—'}</p></div>
            <div><p className="text-slate-400">Statut</p><p className="font-medium">{locataire.actif ? 'Actif' : 'Inactif'}</p></div>
            <div><p className="text-slate-400">Résiliation anticipée</p><p className="font-medium">{locataire.resilitation_anticipee ? 'Oui' : 'Non'}</p></div>
          </div>
        </section>

        <hr className="border-slate-100" />
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Finances</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div><p className="text-slate-400">Loyer hors charges</p><p className="font-medium">{Number(locataire.loyer_hc).toLocaleString('fr-FR')} €</p></div>
            <div><p className="text-slate-400">Charges</p><p className="font-medium">{Number(locataire.charges).toLocaleString('fr-FR')} €</p></div>
            <div><p className="text-slate-400">Total mensuel</p><p className="font-semibold">{total.toLocaleString('fr-FR')} € CC</p></div>
            <div><p className="text-slate-400">Caution</p><p className="font-medium">{Number(locataire.caution ?? 0).toLocaleString('fr-FR')} € — {locataire.caution_payee ? 'reçue' : 'en attente'}</p></div>
          </div>
        </section>

        {locataire.commentaire && <><hr className="border-slate-100" /><section><h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Commentaire</h2><p className="text-sm text-slate-700 whitespace-pre-wrap">{locataire.commentaire}</p></section></>}
      </div>
    </div>
  )
}
