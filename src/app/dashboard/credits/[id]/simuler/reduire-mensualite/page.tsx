import {Calculator,ArrowLeft} from 'lucide-react'
import Link from 'next/link'
import {loadSimulatorLoan} from '@/lib/prepaymentData'
import SimulationTabs from '../SimulationTabs'
import PaymentReductionSimulator from './PaymentReductionSimulator'
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params,loan=await loadSimulatorLoan(id);return <div className="simulateur-ui mx-auto max-w-6xl p-4 sm:p-6"><Link href="/dashboard/credits" className="sim-back"><ArrowLeft size={16}/> Retour aux crédits</Link><div className="sim-heading"><span><Calculator size={25}/></span><div><h1>Réduire la mensualité</h1><p>Explorez les effets de ce scénario sur votre crédit.</p></div></div><p className="mt-1 text-sm text-slate-500">{loan.nom}{loan.ville?` — ${loan.ville}`:''}</p><SimulationTabs id={id} active="reduction"/><PaymentReductionSimulator loan={loan}/></div>}
