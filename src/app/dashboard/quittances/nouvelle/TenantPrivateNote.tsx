'use client'
import CommentEditor from '@/components/CommentEditor'
import {useEffect,useState} from 'react'
import {enregistrerNoteInterne} from './note-actions'
export default function TenantPrivateNote({locataireId,initial}:{locataireId:string;initial:string}){
 const[value,setValue]=useState(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{setValue(initial);setMessage('')},[locataireId,initial]);
 async function save(){setBusy(true);setMessage('');try{const r=await enregistrerNoteInterne(locataireId,value);setMessage(r.error||'Note interne enregistrée.')}catch{setMessage('Enregistrement impossible. Réessayez.')}finally{setBusy(false)}}
 return <section className="rounded-xl border bg-slate-50 p-3"><label htmlFor="qualite-interne" className="block text-sm font-medium mb-1">Qualité du locataire — note interne</label><CommentEditor id="qualite-interne" value={value} onChange={e=>setValue(e.target.value)} maxLength={2000} rows={2} className="w-full rounded-xl border px-3 py-2 text-sm"/><p className="text-xs text-slate-500 mt-1">Visible par le bailleur uniquement. Cette note n’apparaît ni sur le document ni dans les e-mails.</p><button type="button" onClick={save} disabled={busy} className="mt-2 border bg-white rounded-lg px-3 py-2 text-sm disabled:opacity-50">{busy?'Enregistrement…':'Enregistrer la note interne'}</button>{message&&<p role="status" className="text-xs mt-2">{message}</p>}</section>
}
