'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function creerQuittance(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Vous devez être connecté pour créer une quittance.' }

  const locataireId = formData.get('locataire_id') as string
  const mois = formData.get('mois') as string
  const commentaire = formData.get('commentaire') as string
  if (!locataireId || !mois) return { error: 'Le locataire et le mois sont obligatoires.' }

  const { data: locataire, error: locataireError } = await supabase
    .from('locataires')
    .select('bien_id, bail_id, loyer_hc, charges')
    .eq('id', locataireId).eq('proprietaire_id', user.id).single()
  if (locataireError || !locataire) return { error: 'Locataire introuvable.' }

  let loyerHc = Number(locataire.loyer_hc ?? 0)
  let charges = Number(locataire.charges ?? 0)
  let bailId = locataire.bail_id as string | null

  // Pour les baux modernes, le bail est la source de vérité des montants.
  if (bailId) {
    const { data: bail } = await supabase.from('baux').select('loyer_hc,charges').eq('id', bailId).eq('proprietaire_id', user.id).single()
    if (bail) { loyerHc = Number(bail.loyer_hc ?? 0); charges = Number(bail.charges ?? 0) }
  }

  // Une affectation est applicable au mois si elle chevauche au moins un jour
  // de la période. On conserve ensuite un snapshot dans la quittance.
  const [year, month] = mois.split('-').map(Number)
  if (!year || !month) return { error: 'Période de quittance invalide.' }
  const debutMois = `${mois}-01`
  const finMois = new Date(year, month, 0).toISOString().slice(0, 10)
  let lotsDetail: Array<{ lot_id: string; numero_lot: string; type: string; prix_mensuel: number }> = []

  if (bailId) {
    const { data: affectations, error: affError } = await supabase
      .from('affectations_lots_baux')
      .select('lot_id,date_debut,date_fin,prix_mensuel,lots(numero_lot,type)')
      .eq('bail_id', bailId)
      .lte('date_debut', finMois)
      .or(`date_fin.is.null,date_fin.gte.${debutMois}`)
    if (affError) return { error: `Impossible de vérifier les lots rattachés : ${affError.message}` }
    lotsDetail = (affectations ?? []).map((a: any) => {
      const lot = Array.isArray(a.lots) ? a.lots[0] : a.lots
      return { lot_id: a.lot_id, numero_lot: lot?.numero_lot ?? '', type: lot?.type ?? 'lot', prix_mensuel: Number(a.prix_mensuel ?? 0) }
    })
  }

  const lotsTotal = lotsDetail.reduce((s, l) => s + l.prix_mensuel, 0)
  const totalDu = loyerHc + charges + lotsTotal

  const { data: paiements, error: paiementError } = await supabase
    .from('paiements').select('montant, statut').eq('proprietaire_id', user.id)
    .eq('locataire_id', locataireId).eq('mois', mois).in('statut', ['recu', 'partiel'])
  if (paiementError) return { error: `Impossible de vérifier le paiement : ${paiementError.message}` }
  const totalEncaisse = (paiements ?? []).reduce((s, p) => s + Number(p.montant ?? 0), 0)
  if (totalEncaisse + 0.001 < totalDu) {
    const reste = Math.max(0, totalDu - totalEncaisse)
    return { error: `Quittance indisponible : ${totalEncaisse.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} € encaissés sur ${totalDu.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} €. Il reste ${reste.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} € à régler.` }
  }

  const { data: existante } = await supabase.from('quittances').select('id').eq('proprietaire_id', user.id).eq('locataire_id', locataireId).eq('mois', mois).maybeSingle()
  if (existante) return { error: 'Une quittance existe déjà pour ce locataire et cette période.' }

  const { error } = await supabase.from('quittances').insert({
    proprietaire_id:user.id, locataire_id:locataireId, bien_id:locataire.bien_id??null, mois,
    loyer_hc:loyerHc, charges, lots_annexes_total:lotsTotal, lots_annexes_detail:lotsDetail,
    solde:0, total:totalDu, envoyee:false,
    caution_affichee:formData.get('caution_affichee')==='on',
    date_signature:formData.get('date_signature') as string, commentaire:commentaire||null,
  })
  if (error) return { error: error.message }
  revalidatePath('/dashboard/quittances'); revalidatePath('/dashboard/paiements'); revalidatePath('/dashboard'); revalidatePath('/dashboard/rentabilite')
  return { ok:true }
}
