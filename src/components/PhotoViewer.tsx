'use client'
import {useEffect,useRef} from 'react'
import {createPortal} from 'react-dom'
import {X,ChevronLeft,ChevronRight} from 'lucide-react'

type Props={photos:{url:string}[];index:number;name:string;onChange:(index:number)=>void;onClose:()=>void}
export default function PhotoViewer({photos,index,name,onChange,onClose}:Props){
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{const node=dialog.current;if(!node)return;node.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{node.close();document.body.style.overflow=overflow}},[])
 if(!photos[index])return null
 return createPortal(<dialog ref={dialog} className="property-photo-viewer" aria-label={`Photos de ${name}`} onClose={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose()}} onKeyDown={e=>{if(e.key==='ArrowLeft'&&photos.length>1){e.preventDefault();onChange((index+photos.length-1)%photos.length)}if(e.key==='ArrowRight'&&photos.length>1){e.preventDefault();onChange((index+1)%photos.length)}}}>
 <div className="property-photo-viewer-content"><header><span>{name} · {index+1} / {photos.length}</span><button type="button" onClick={onClose} aria-label="Fermer la photo"><X/></button></header><img src={photos[index].url} alt={`Photo ${index+1} de ${name}`}/>{photos.length>1&&<nav aria-label="Parcourir les photos"><button type="button" aria-label="Photo précédente" onClick={()=>onChange((index+photos.length-1)%photos.length)}><ChevronLeft/></button><button type="button" aria-label="Photo suivante" onClick={()=>onChange((index+1)%photos.length)}><ChevronRight/></button></nav>}</div>
 </dialog>,document.body)
}
