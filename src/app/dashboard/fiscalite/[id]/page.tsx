import {notFound} from 'next/navigation'
import FiscalView from '../FiscalView'
import {loadFiscalData} from '@/lib/fiscalData'
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{annee?:string}>}){const{id}=await params,props=await loadFiscalData();if(!props.data.biens.some(b=>b.id===id))notFound();return <FiscalView {...props} id={id} initialYear={(await searchParams).annee}/>}
