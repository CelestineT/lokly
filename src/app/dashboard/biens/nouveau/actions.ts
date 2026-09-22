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
  const nbLots = formData.get('nb_lots')
  const annexes = formData.getAll('annexes') as string[]
  const lotsJson = formData.get('lots_json') as string | null
  const type = formData.get('type') as string

  const { data: bien, error } = await supabase.from('biens').insert({
    proprietaire_id: user.id,
    nom: formData.get('nom') as string,
    adresse: formData.get('adresse') as string,
    ville: formData.get('ville') as string,
    code_postal: formData.get('code_postal') as string,
    type,
    type_location: formData.get('type_location') as string,
    surface_m2: surface ? Number(surface) : null,
    nb_pieces: pieces ? Number(pieces) : null,
    prix_achat: prix ? Number(prix) : null,
    surface_totale_m2: surface && type === 'immeuble_rapport' ? Number(surface) : null,
    nb_lots: nbLots ? Number(nbLots) : null,
    annexes: annexes.length > 0 ? annexes : [],
  }).select().single()

  if (error) {
    return { error: error.message }
  }

  // Insérer les lots si immeuble de rapport
  if (type === 'immeuble_rapport' && lotsJson && bien) {
    const lots = JSON.parse(lotsJson)
    const lotsToInsert = lots.map((lot: {
      surface_m2: string
      nb_pieces: string
      type_location: string
      annexes: string[]
    }, index: number) => ({
      bien_id: bien.id,
      proprietaire_id: user.id,
      numero_lot: `Lot ${index + 1}`,
      type: 'appartement',
      type_location: lot.type_location,
      surface_m2: lot.surface_m2 ? Number(lot.surface_m2) : null,
      nb_pieces: lot.nb_pieces ? Number(lot.nb_pieces) : null,
      annexes: lot.annexes ?? [],
    }))

    const { error: lotsError } = await supabase.from('lots').insert(lotsToInsert)
    if (lotsError) {
      return { error: lotsError.message }
    }
  }

  revalidatePath('/dashboard/biens')
  redirect('/dashboard/biens')
}