import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ModifierBienForm from './ModifierBienForm'

export default async function ModifierBienPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: bien } = await supabase
    .from('biens')
    .select('*')
    .eq('id', id)
    .single()

  if (!bien) notFound()

  return <ModifierBienForm bien={bien} />
}