'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function ajouterLocataire(formData: FormData) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Vous devez être connecté.' }
  }

  const dateEntree = formData.get('date_entree') as string
  const dureeBail = Number(formData.get('duree_bail_ans') ?? 3)

  const echeanceBail = new Date(dateEntree)
  echeanceBail.setFullYear(echeanceBail.getFullYear() + dureeBail)

  const { error } = await supabase.from('locataires').insert({
    proprietaire_id: user.id,
    bien_id: formData.get('bien_id') as string,
    nom: formData.get('nom') as string,
    email: formData.get('email') as string,
    telephone: formData.get('telephone') as string || null,
    date_entree: dateEntree,
    loyer_hc: Number(formData.get('loyer_hc')),
    charges: Number(formData.get('charges') ?? 0),
    caution: Number(formData.get('caution') ?? 0),
    caution_payee: formData.get('caution_payee') === 'on',
    duree_bail_ans: dureeBail,
    echeance_bail: echeanceBail.toISOString().split('T')[0],
    mode_paiement: formData.get('mode_paiement') as string,
    commentaire: formData.get('commentaire') as string || null,
    actif: true,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/locataires')
  redirect('/dashboard/locataires')
}