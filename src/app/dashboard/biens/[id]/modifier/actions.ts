'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function modifierBien(id: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Vous devez être connecté.' }
  }

  const type = formData.get('type') as string
  const isImmeuble = type === 'immeuble' || type === 'immeuble_rapport'

  const surface = formData.get('surface_m2')
  const surfaceTotale = formData.get('surface_totale_m2')
  const pieces = formData.get('nb_pieces')
  const lots = formData.get('nb_lots')
  const prix = formData.get('prix_achat')
  const annexes = formData.getAll('annexes') as string[]

  const { error } = await supabase
    .from('biens')
    .update({
      nom: formData.get('nom') as string,
      adresse: formData.get('adresse') as string,
      ville: formData.get('ville') as string,
      code_postal: formData.get('code_postal') as string,
      type,
      type_location: formData.get('type_location') as string,
      surface_m2: !isImmeuble && surface ? Number(surface) : null,
      surface_totale_m2: isImmeuble && surfaceTotale ? Number(surfaceTotale) : null,
      nb_pieces: !isImmeuble && pieces ? Number(pieces) : null,
      nb_lots: isImmeuble && lots ? Number(lots) : null,
      prix_achat: prix ? Number(prix) : null,
      annexes,
    })
    .eq('id', id)
    .eq('proprietaire_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/biens')
  return { ok: true }
}