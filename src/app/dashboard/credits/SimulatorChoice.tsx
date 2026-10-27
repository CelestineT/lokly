'use client'
import {useState} from 'react'
import {useRouter} from 'next/navigation'
export default function SimulatorChoice({items}:{items:{id:string;name:string}[]}){const [id,setId]=useState(''),router=useRouter();return <div className="credit-simulator-choice"><label><span className="sr-only">Financement à simuler</span><select value={id} onChange={e=>setId(e.target.value)}><option value="">Choisir un financement</option>{items.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><button type="button" disabled={!id} onClick={()=>router.push(`/dashboard/credits/${encodeURIComponent(id)}/simuler`)}>Accéder au simulateur</button></div>}
