'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function ajouterLocataire(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const bien_id = formData.get('bien_id') as string
  const lot_id = formData.get('lot_id') as string | null
  const date_entree = formData.get('date_entree') as string
  const loyer_hc = parseFloat(formData.get('loyer_hc') as string) || 0
  const charges = parseFloat(formData.get('charges') as string) || 0
  const caution = parseFloat(formData.get('caution') as string) || null
  const caution_payee = formData.get('caution_payee') === 'on'
  const duree_bail_ans = parseInt(formData.get('duree_bail_ans') as string) || 3
  const mode_paiement = formData.get('mode_paiement') as string
  const commentaire = formData.get('commentaire') as string

  // Calcul échéance bail
  const echeance = new Date(date_entree)
  echeance.setFullYear(echeance.getFullYear() + duree_bail_ans)
  const echeance_bail = echeance.toISOString().split('T')[0]

  // Locataires (prénom + nom séparés, concatenés pour le champ nom)
  const locatairesJson = formData.get('locataires_json') as string
  let locataires: { prenom: string; nom: string; email: string; telephone: string }[] = []
  try {
    locataires = JSON.parse(locatairesJson)
  } catch {
    return { error: 'Données locataires invalides' }
  }

  // Filtrer les locataires vides (facultatifs non remplis)
  const locatairesFilled = locataires.filter(l => l.prenom.trim() || l.nom.trim() || l.email.trim())

  if (locatairesFilled.length === 0) {
    return { error: 'Au moins un locataire est requis' }
  }

  // Insérer chaque locataire
  for (const loc of locatairesFilled) {
    const nomComplet = `${loc.prenom.trim()} ${loc.nom.trim()}`.trim()

    const payload: Record<string, unknown> = {
      proprietaire_id: user.id,
      bien_id,
      nom: nomComplet,
      email: loc.email.trim(),
      telephone: loc.telephone.trim() || null,
      date_entree,
      loyer_hc,
      charges,
      caution: caution ?? null,
      caution_payee,
      duree_bail_ans,
      echeance_bail,
      mode_paiement: mode_paiement || null,
      commentaire: commentaire || null,
      actif: true,
    }

    // Rattacher au lot si présent
    if (lot_id && lot_id !== '') {
      payload.lot_id = lot_id
    }

    const { error } = await supabase.from('locataires').insert(payload)
    if (error) return { error: error.message }
  }

  redirect('/dashboard/locataires')
}