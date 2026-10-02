'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function creerQuittance(formData: FormData) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Vous devez être connecté pour créer une quittance.' }
  }

  const locataireId = formData.get('locataire_id') as string
  const mois = formData.get('mois') as string
  const commentaire = formData.get('commentaire') as string

  if (!locataireId || !mois) {
    return { error: 'Le locataire et le mois sont obligatoires.' }
  }

  // Les montants de la quittance viennent du bail/locataire enregistré,
  // pas de valeurs modifiables envoyées par le navigateur.
  const { data: locataire, error: locataireError } = await supabase
    .from('locataires')
    .select('bien_id, loyer_hc, charges')
    .eq('id', locataireId)
    .eq('proprietaire_id', user.id)
    .single()

  if (locataireError || !locataire) {
    return { error: 'Locataire introuvable.' }
  }

  const loyerHc = Number(locataire.loyer_hc ?? 0)
  const charges = Number(locataire.charges ?? 0)
  const totalDu = loyerHc + charges

  // Une recette existe au moment de l'encaissement. Une quittance n'est
  // autorisée que lorsque les paiements reçus/partiels couvrent le total dû.
  const { data: paiements, error: paiementError } = await supabase
    .from('paiements')
    .select('montant, statut')
    .eq('proprietaire_id', user.id)
    .eq('locataire_id', locataireId)
    .eq('mois', mois)
    .in('statut', ['recu', 'partiel'])

  if (paiementError) {
    return { error: `Impossible de vérifier le paiement : ${paiementError.message}` }
  }

  const totalEncaisse = (paiements ?? []).reduce(
    (somme, paiement) => somme + Number(paiement.montant ?? 0),
    0
  )

  if (totalEncaisse + 0.001 < totalDu) {
    const reste = Math.max(0, totalDu - totalEncaisse)
    return {
      error: `Quittance indisponible : ${totalEncaisse.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € encaissés sur ${totalDu.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €. Il reste ${reste.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € à régler.`
    }
  }

  // Empêcher une seconde quittance pour le même locataire et la même période.
  const { data: existante } = await supabase
    .from('quittances')
    .select('id')
    .eq('proprietaire_id', user.id)
    .eq('locataire_id', locataireId)
    .eq('mois', mois)
    .maybeSingle()

  if (existante) {
    return { error: 'Une quittance existe déjà pour ce locataire et cette période.' }
  }

  const { error } = await supabase.from('quittances').insert({
    proprietaire_id: user.id,
    locataire_id: locataireId,
    bien_id: locataire.bien_id ?? null,
    mois,
    loyer_hc: loyerHc,
    charges,
    solde: 0,
    total: totalDu,
    envoyee: false,
    caution_affichee: formData.get('caution_affichee') === 'on',
    date_signature: formData.get('date_signature') as string,
    commentaire: commentaire || null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/quittances')
  revalidatePath('/dashboard/paiements')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/rentabilite')
  return { ok: true }
}