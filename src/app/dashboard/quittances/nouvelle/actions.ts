'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function creerQuittance(formData: FormData) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Vous devez être connecté pour créer une quittance.' }
  }

  const loyerHc = Number(formData.get('loyer_hc') ?? 0)
  const charges = Number(formData.get('charges') ?? 0)
  const solde = Number(formData.get('solde') ?? 0)
  const total = loyerHc + charges + solde

  const commentaire = formData.get('commentaire') as string

  const { error } = await supabase.from('quittances').insert({
    proprietaire_id: user.id,
    locataire_id: formData.get('locataire_id') as string,
    mois: formData.get('mois') as string,
    loyer_hc: loyerHc,
    charges,
    solde,
    total,
    envoyee: false,
    caution_affichee: formData.get('caution_affichee') === 'on',
    date_signature: formData.get('date_signature') as string,
    commentaire: commentaire || null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/quittances')
  redirect('/dashboard/quittances')
}