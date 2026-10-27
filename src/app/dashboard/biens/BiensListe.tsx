'use client'
import {useMemo,useState,type ReactNode} from 'react'
import OrderedCards from '@/components/OrderedCards'
import {Building2,House,Warehouse,Users,Search} from 'lucide-react'
type Item={id:string;label:string;content:ReactNode;ville:string;type:string;adresse:string;logements:number;annexes:number;occupes:number}
export default function BiensListe({items,saved}:{items:Item[];saved:string[]}){
 const [query,setQuery]=useState(''),[ville,setVille]=useState(''),[type,setType]=useState('')
 const villes=Array.from(new Set(items.map(i=>i.ville).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'fr'))
 const types=Array.from(new Set(items.map(i=>i.type))).sort((a,b)=>a.localeCompare(b,'fr'))
 const visible=useMemo(()=>items.filter(i=>(!ville||i.ville===ville)&&(!type||i.type===type)&&(!query||`${i.label} ${i.adresse} ${i.ville}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr').trim()))),[items,query,ville,type])
 const numbers=[{icon:House,value:visible.length,label:'biens'},{icon:Building2,value:visible.reduce((n,i)=>n+i.logements,0),label:'logements'},{icon:Warehouse,value:visible.reduce((n,i)=>n+i.annexes,0),label:'annexes'},{icon:Users,value:visible.reduce((n,i)=>n+i.occupes,0),label:'logements occupés'}]
 const filtered=!!(query||ville||type)
 return <><div className="biens-filters"><label><Search size={17}/><span className="sr-only">Rechercher un bien ou une adresse</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un bien ou une adresse"/></label><select aria-label="Filtrer par ville" value={ville} onChange={e=>setVille(e.target.value)}><option value="">Toutes les villes</option>{villes.map(v=><option key={v}>{v}</option>)}</select><select aria-label="Filtrer par type" value={type} onChange={e=>setType(e.target.value)}><option value="">Tous les types</option>{types.map(v=><option key={v}>{v}</option>)}</select></div><div className="biens-summary">{numbers.map(({icon:Icon,value,label})=><div key={label}><span><Icon size={22}/></span><div><strong>{value}</strong><p>{label}</p></div></div>)}</div>{visible.length===0?<p className="biens-empty">Aucun bien ne correspond à votre recherche.</p>:filtered?<div className="biens-grid">{visible.map(i=><div key={i.id}>{i.content}</div>)}</div>:<OrderedCards className="biens-grid" scope="biens" saved={saved} label="Réorganiser" items={visible}/>}<p className="biens-hint">ⓘ &nbsp; Un bien peut regrouper plusieurs logements, garages ou box.</p></>
}
