'use client'
import {useState,useId} from 'react'
type Props={options:readonly string[];name?:string;value?:string;defaultValue?:string;onChange?:(value:string)=>void;className?:string;label?:string;placeholder?:string;required?:boolean}
export default function OtherSelect({options,name,value,defaultValue='',onChange,className='',label='Précisez votre choix',placeholder='Aucune spécificité',required=false}:Props){
 const [local,setLocal]=useState(defaultValue),id=useId(),current=value??local,other=current==='Autre'||(!!current&&!options.includes(current))
 function change(v:string){setLocal(v);onChange?.(v)}
 return <div className="space-y-2"><select aria-label={name==='type_travaux'?'Type de travaux':'Spécificité du logement'} required={required} value={other?'Autre':current} onChange={e=>change(e.target.value)} className={className}><option value="">{placeholder}</option>{options.map(v=><option key={v}>{v}</option>)}</select>{name&&<input type="hidden" name={name} value={current==='Autre'?'':current}/>} {other&&<div className="rounded-xl bg-blue-50 p-3"><label htmlFor={id} className="block text-sm font-medium">{label} *</label><input id={id} value={current==='Autre'?'':current} onChange={e=>change(e.target.value||'Autre')} required pattern={'.*\\S.*'} maxLength={120} placeholder="Votre précision" className={className}/></div>}</div>
}
