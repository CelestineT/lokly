import Link from 'next/link'
import {loadSimulatorLoan} from '@/lib/prepaymentData'
import SimulationTabs from '../SimulationTabs'
import PaymentReductionSimulator from './PaymentReductionSimulator'
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params,loan=await loadSimulatorLoan(id);return <div className="mx-auto max-w-6xl p-4 sm:p-6"><Link href="/dashboard/credits" className="text-sm text-slate-500">← Retour aux crédits</Link><h1 className="mt-5 text-2xl font-bold">Réduire la mensualité</h1><p className="mt-1 text-sm text-slate-500">{loan.nom}{loan.ville?` — ${loan.ville}`:''}</p><SimulationTabs id={id} active="reduction"/><PaymentReductionSimulator loan={loan}/></div>}
