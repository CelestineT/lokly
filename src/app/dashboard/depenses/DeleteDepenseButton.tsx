'use client'
import {Trash2} from 'lucide-react'
import {useState} from 'react'
import {useRouter} from 'next/navigation'
import {supprimerDepense} from './actions'
export default function DeleteDepenseButton({id,onDeleted,returnToList=false}:{id:string;onDeleted?:()=>void;returnToList?:boolean}){
 const router=useRouter(),[confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function remove(){setBusy(true);setError('');try{const result=await supprimerDepense(id);if(result.error)setError(result.error);else{onDeleted?.();if(returnToList)router.push('/dashboard/depenses');router.refresh()}}catch{setError('La suppression a échoué. Réessayez.')}finally{setBusy(false)}}
 return <div className="text-xs">{!confirm?<button type="button" onClick={()=>setConfirm(true)} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-red-600"><Trash2 size={14} aria-hidden="true"/> Supprimer</button>:<div role="group" aria-label="Confirmer la suppression" className="rounded-xl border border-red-200 bg-red-50 p-3"><p className="mb-2 text-red-800">Supprimer définitivement cette dépense ? Les totaux seront recalculés.</p><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={remove} className="rounded-lg bg-red-600 px-3 py-2 text-white disabled:opacity-50">{busy?'Suppression…':'Confirmer la suppression'}</button><button type="button" disabled={busy} onClick={()=>{setConfirm(false);setError('')}} className="rounded-lg border bg-white px-3 py-2">Annuler</button></div></div>}{error&&<p role="alert" className="mt-2 text-red-700">{error}</p>}</div>
}
