'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function ajouterDepense(formData: FormData) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Vous devez être connecté.' }
  }

  const bien_id = formData.get('bien_id') as string || null
  const description = formData.get('description') as string

  const { error } = await supabase.from('depenses').insert({
    proprietaire_id: user.id,
    bien_id: bien_id || null,
    categorie: formData.get('categorie') as string,
    montant: Number(formData.get('montant') ?? 0),
    date_depense: formData.get('date_depense') as string,
    description: description || null,
    deductible_fiscalement: formData.get('deductible_fiscalement') === 'on',
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/depenses')
  redirect('/dashboard/depenses')
}