'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const NON_HABITABLE = new Set(['parking','box','garage','cave','autre'])

export async function ajouterBien(formData: FormData) {
  const supabase = await createClient()
  const { data:{ user } } = await supabase.auth.getUser()
  if (!user) return { error:'Vous devez être connecté pour ajouter un bien.' }

  const type=String(formData.get('type') ?? '')
  const surface=formData.get('surface_m2'), pieces=formData.get('nb_pieces'), prix=formData.get('prix_achat'), nbLots=formData.get('nb_lots')
  const annexes=formData.getAll('annexes') as string[]
  const lotsJson=formData.get('lots_json') as string|null
  const typeLocation=NON_HABITABLE.has(type) ? null : (formData.get('type_location') as string || null)

  const { data:bien,error }=await supabase.from('biens').insert({
    proprietaire_id:user.id, nom:String(formData.get('nom')??''), adresse:String(formData.get('adresse')??''), ville:String(formData.get('ville')??''), code_postal:String(formData.get('code_postal')??''), type,
    type_location:typeLocation, specificite:(formData.get('specificite') as string)||null,
    parent_bien_id:(formData.get('parent_bien_id') as string)||null, rattachement_type:(formData.get('rattachement_type') as string)||null,
    locataire_externe_nom:(formData.get('locataire_externe_nom') as string)||null, locataire_externe_email:(formData.get('locataire_externe_email') as string)||null,
    surface_m2:surface?Number(surface):null, nb_pieces:pieces?Number(pieces):null, prix_achat:prix?Number(prix):null,
    surface_totale_m2:surface && type==='immeuble_rapport'?Number(surface):null, nb_lots:nbLots?Number(nbLots):null, annexes
  }).select().single()
  if(error)return { error:error.message }

  if(type==='immeuble_rapport' && lotsJson && bien){
    const lots=JSON.parse(lotsJson)
    const rows=lots.map((lot:{type_lot:string;surface_m2:string;nb_pieces:string;type_location:string;annexes:string[]},i:number)=>({ bien_id:bien.id,proprietaire_id:user.id,numero_lot:`Lot ${i+1}`,type:lot.type_lot||'appartement',type_location:lot.type_location||null,surface_m2:lot.surface_m2?Number(lot.surface_m2):null,nb_pieces:lot.nb_pieces?Number(lot.nb_pieces):null,annexes:lot.annexes??[] }))
    const { error:lotsError }=await supabase.from('lots').insert(rows); if(lotsError)return { error:lotsError.message }
  }
  revalidatePath('/dashboard'); revalidatePath('/dashboard/biens'); redirect('/dashboard/biens')
}
