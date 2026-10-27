'use client'
import {useEffect,useRef,useState} from 'react'
import {createClient} from '@/lib/supabase/client'
import {Camera} from 'lucide-react'

export default function PhotoBien({id,nom}:{id:string;nom:string}){
 const [url,setUrl]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 const input=useRef<HTMLInputElement>(null)
 async function signed(){const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user)return;const {data}=await s.storage.from('documents').createSignedUrl(`${user.id}/biens/${id}/photo`,3600);if(data?.signedUrl)setUrl(data.signedUrl)}
 useEffect(()=>{void signed()},[id])
 async function upload(file:File|undefined){if(!file)return;setMessage('');if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){setMessage('Choisissez une image JPG, PNG ou WebP de 5 Mo maximum.');return}setBusy(true);try{const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user)throw new Error('Connectez-vous pour modifier la photo.');const {error}=await s.storage.from('documents').upload(`${user.id}/biens/${id}/photo`,file,{upsert:true,contentType:file.type,cacheControl:'60'});if(error)throw error;await signed();setMessage('Photo enregistrée.')}catch{setMessage('Impossible d’enregistrer la photo. Vérifiez votre connexion et réessayez.')}finally{setBusy(false);if(input.current)input.current.value=''}}
 return <div className="photo-bien"><button type="button" onClick={()=>input.current?.click()} disabled={busy} aria-label={`Modifier la photo de ${nom}`}><img src={url||'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80'} alt={url?`Photo de ${nom}`:'Illustration fictive du bien'}/><span><Camera size={16}/> {busy?'Enregistrement…':url?'Modifier la photo':'Ajouter une photo'}</span></button><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>void upload(e.target.files?.[0])}/>{message&&<p role="status">{message}</p>}</div>
}
