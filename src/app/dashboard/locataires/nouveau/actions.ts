'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatLocataireName } from '@/lib/locataireName'

export async function ajouterLocataire(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const bien_id = formData.get('bien_id') as string
  const lot_id = (formData.get('lot_id') as string | null) || null
  const date_entree = formData.get('date_entree') as string
  const loyer_hc = parseFloat(formData.get('loyer_hc') as string) || 0
  const charges = parseFloat(formData.get('charges') as string) || 0
  const cautionRaw = formData.get('caution') as string
  const caution = cautionRaw ? parseFloat(cautionRaw) : null
  const caution_payee = formData.get('caution_payee') === 'on'
  const duree_bail_ans = parseInt(formData.get('duree_bail_ans') as string) || 3
  const mode_paiement = formData.get('mode_paiement') as string
  const commentaire = formData.get('commentaire') as string
  const type_occupation = (formData.get('type_occupation') as string) || 'individuel'

  if (!bien_id || !date_entree) return { error: 'Le bien et la date d’entrée sont requis' }

  // Le rattachement doit aussi être validé côté serveur, même si le formulaire est contourné.
  const { data: bien, error: bienError } = await supabase.from('biens')
    .select('id,type').eq('id', bien_id).eq('proprietaire_id', user.id).maybeSingle()
  if (bienError || !bien) return { error: 'Bien introuvable ou inaccessible' }
  const isImmeuble = ['immeuble', 'immeuble_rapport'].includes(bien.type ?? '')
  if (isImmeuble && !lot_id) return { error: 'Sélectionnez le lot occupé dans cet immeuble.' }
  if (lot_id) {
    const { data: lot, error: lotError } = await supabase.from('lots')
      .select('id').eq('id', lot_id).eq('bien_id', bien_id).eq('proprietaire_id', user.id).maybeSingle()
    if (lotError || !lot) return { error: 'Le lot sélectionné ne correspond pas à ce bien.' }
  }

  const echeance = new Date(date_entree)
  echeance.setFullYear(echeance.getFullYear() + duree_bail_ans)
  const echeance_bail = echeance.toISOString().split('T')[0]

  const locatairesJson = formData.get('locataires_json') as string
  let locataires: { civilite:string; prenom: string; nom: string; email: string; telephone: string }[] = []
  try { locataires = JSON.parse(locatairesJson) } catch { return { error: 'Données locataires invalides' } }
  const filled = locataires.filter(l => l.prenom.trim() || l.nom.trim() || l.email.trim())
  if (!filled.length) return { error: 'Au moins un locataire est requis' }

  const occupation = filled.length === 1 ? 'individuel' : type_occupation
  if (filled.length > 1 && !['bail_commun','colocation'].includes(occupation)) return { error: 'Précisez s’il s’agit d’un bail commun ou d’une colocation' }

  const { data: bail, error: bailError } = await supabase.from('baux').insert({
    proprietaire_id: user.id, bien_id, lot_id, type_occupation: occupation,
    date_entree, loyer_hc, charges, caution, caution_payee, duree_bail_ans,
    echeance_bail, mode_paiement: mode_paiement || null, commentaire: commentaire || null, actif: true,
  }).select('id').single()
  if (bailError || !bail) return { error: bailError?.message || 'Impossible de créer le bail' }

  for (let i = 0; i < filled.length; i++) {
    const loc = filled[i]
    const prenom=loc.prenom.trim(), nomFamille=loc.nom.trim(), civilite=loc.civilite||null
    const payload: Record<string, unknown> = {
      proprietaire_id: user.id, bien_id, bail_id: bail.id, est_principal: i === 0,
      civilite, prenom, nom_famille:nomFamille,
      nom: formatLocataireName({civilite,nom_famille:nomFamille,prenom},''),
      email: loc.email.trim(), telephone: loc.telephone.trim() || null,
      date_entree, loyer_hc, charges, caution, caution_payee, duree_bail_ans,
      echeance_bail, mode_paiement: mode_paiement || null, commentaire: commentaire || null, actif: true,
    }
    const { error } = await supabase.from('locataires').insert(payload)
    if (error) { await supabase.from('baux').delete().eq('id', bail.id); return { error: error.message } }
  }
  redirect('/dashboard/locataires')
}
