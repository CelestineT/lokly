'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supprimerBien } from './actions'

export default function DeleteBienButton({ id, nom }: { id: string; nom: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!window.confirm(`Confirmer la suppression de « ${nom} » ?`)) return
    setLoading(true)
    const result = await supprimerBien(id)
    if (result?.error) {
      window.alert(result.error)
      setLoading(false)
      return
    }
    // Le bien n'existe plus : ne pas rafraîchir sa fiche, revenir à la liste.
    router.replace('/dashboard/biens')
    router.refresh()
  }

  return <button type="button" onClick={handleDelete} disabled={loading} className="text-xs font-medium text-red-600 border border-red-200 rounded-lg px-2.5 py-1.5 disabled:opacity-50">{loading ? 'Suppression…' : 'Supprimer'}</button>
}
