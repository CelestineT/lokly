'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteLocataireButton({ id, nom }: { id: string; nom: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(`Supprimer le locataire « ${nom} » ? Cette action est définitive.`)) return

    setDeleting(true)
    setError(null)
    const supabase = createClient()

    // Les alertes ne sont pas en cascade dans le schéma actuel.
    const { error: alertesError } = await supabase.from('alertes').delete().eq('locataire_id', id)
    if (alertesError) {
      setError(alertesError.message)
      setDeleting(false)
      return
    }

    const { error: deleteError } = await supabase.from('locataires').delete().eq('id', id)
    if (deleteError) {
      setError(deleteError.message)
      setDeleting(false)
      return
    }

    router.push('/dashboard/locataires')
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={handleDelete} disabled={deleting}
        className="inline-flex items-center gap-1.5 border border-red-200 text-red-600 rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-60">
        {deleting ? 'Suppression…' : 'Supprimer'}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
