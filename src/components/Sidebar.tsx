'use client'

import Link from 'next/link'
import {House,Menu,Ellipsis,ChevronRight,UserRound} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const icon=(children:React.ReactNode)=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
const navItems=[
{href:'/dashboard/biens',label:'Biens',icon:icon(<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>)},
{href:'/dashboard/locataires',label:'Locataires',icon:icon(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>)},
{href:'/dashboard/paiements',label:'Paiements loyers',icon:icon(<><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>)},
{href:'/dashboard/quittances',label:'Quittances loyers',icon:icon(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>)},
{href:'/dashboard/credits',label:'Crédits immobiliers',icon:icon(<><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="7" y1="15" x2="11" y2="15"/></>)},
{href:'/dashboard/depenses',label:'Dépenses',icon:icon(<><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/></>)},
{href:'/dashboard/rentabilite',label:'Rentabilité',icon:icon(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></>)},
{href:'/dashboard/fiscalite',label:'Fiscalité',icon:icon(<><path d="M9 14l6-6"/><circle cx="9.5" cy="9.5" r="1.5"/><circle cx="14.5" cy="14.5" r="1.5"/><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></>)},
{href:'/dashboard/signatures',label:'Documents',icon:icon(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></>)},
{href:'/dashboard/sms',label:'Communication',icon:icon(<><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><path d="M8 10h8M8 14h5"/></>)},
{href:'/dashboard/parametres',label:'Paramètres',icon:icon(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33A1.65 1.65 0 0 0 14 20.83V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15 1.65 1.65 0 0 0 3.17 14H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9"/></>)},
]
export default function Sidebar(){
 const pathname=usePathname(),router=useRouter(),[open,setOpen]=useState(false)
 async function handleLogout(){const supabase=createClient();await supabase.auth.signOut();router.push('/login')}
 const active=(href:string)=>href==='/dashboard'?pathname==='/dashboard':pathname.startsWith(href)
 const home={href:'/dashboard',label:'Tableau de bord',icon:<House size={20}/>},items=[home,...navItems]
 return <>
 <header className="ekolocs-mobile-header"><Link href="/dashboard" aria-label="Ekolocs — accueil"><img src="/ekolocs-logo.jpeg" alt="Ekolocs — Parc immobilier"/></Link><div><Link href="/dashboard/parametres" aria-label="Mon compte" className="ekolocs-avatar"><UserRound size={18}/></Link><button type="button" aria-label="Menu principal" aria-expanded={open} aria-controls="ekolocs-sidebar" onClick={()=>setOpen(!open)}><Menu size={22}/></button></div></header>
 <aside id="ekolocs-sidebar" className={`ekolocs-sidebar ${open?'is-open':''}`}><Link href="/dashboard" className="ekolocs-brand" aria-label="Ekolocs — accueil"><img src="/ekolocs-logo.jpeg" alt="Ekolocs — Parc immobilier"/></Link><nav className="ekolocs-nav" aria-label="Navigation principale">{items.map(item=><Link key={item.href} href={item.href} onClick={()=>setOpen(false)} aria-current={active(item.href)?'page':undefined}>{item.icon}<span>{item.label}</span></Link>)}</nav><div className="ekolocs-account"><Link href="/dashboard/parametres" onClick={()=>setOpen(false)}><span className="ekolocs-avatar"><UserRound size={18}/></span><span className="flex-1">Mon compte</span><ChevronRight size={16}/></Link><button type="button" onClick={handleLogout}>Se déconnecter</button></div></aside>
 <nav aria-label="Navigation mobile" className="ekolocs-bottom-nav">{[home,navItems[0],navItems[1],navItems[2]].map(item=><Link key={item.href} href={item.href} aria-current={active(item.href)?'page':undefined} onClick={()=>setOpen(false)}>{item.icon}<span>{item===home?'Accueil':item.href.includes('paiements')?'Paiements':item.label}</span></Link>)}<button type="button" aria-expanded={open} aria-controls="ekolocs-sidebar" onClick={()=>setOpen(!open)}><Ellipsis/><span>Plus</span></button></nav>
 </>
}
