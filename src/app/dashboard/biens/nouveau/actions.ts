'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function ajouterBien(formData: FormData) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Vous devez être connecté pour ajouter un bien.' }
  }

  const surface = formData.get('surface_m2')
  const pieces = formData.get('nb_pieces')
  const prix = formData.get('prix_achat')
  const surfaceTotale = formData.get('surface_totale_m2')
  const nbLots = formData.get('nb_lots')
  const annexes = formData.getAll('annexes') as string[]

  const { error } = await supabase.from('biens').insert({
    proprietaire_id: user.id,
    nom: formData.get('nom') as string,
    adresse: formData.get('adresse') as string,
    ville: formData.get('ville') as string,
    code_postal: formData.get('code_postal') as string,
    type: formData.get('type') as string,
    type_location: formData.get('type_location') as string,
    surface_m2: surface ? Number(surface) : null,
    nb_pieces: pieces ? Number(pieces) : null,
    prix_achat: prix ? Number(prix) : null,
    surface_totale_m2: surfaceTotale ? Number(surfaceTotale) : null,
    nb_lots: nbLots ? Number(nbLots) : null,
    annexes: annexes.length > 0 ? annexes : [],
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/biens')
  redirect('/dashboard/biens')
}