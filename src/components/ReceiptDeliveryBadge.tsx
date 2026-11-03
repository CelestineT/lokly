'use client'
import {useState} from 'react'
import {CheckCircle2,Mail,RefreshCw} from 'lucide-react'
import Link from 'next/link'
import {receiptDeliveryLabels,type ReceiptDeliveryRecord} from '@/lib/receiptDeliveryStatus'
export default function ReceiptDeliveryBadge({receiptId,record,unavailable=false}:{receiptId:string;record?:ReceiptDeliveryRecord;unavailable?:boolean}){
 const[status,setStatus]=useState(record?.statut),[error,setError]=useState(''),[busy,setBusy]=useState(false),[checked,setChecked]=useState('')
 async function refresh(){if(!record||busy)return;setBusy(true);setError('');try{
  const r=await fetch('/api/quittance-delivery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:record.id})}),data=await r.json()
  if(!r.ok)throw Error(data.error||'Suivi indisponible.')
  setStatus(data.status);setChecked(new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}));if(data.message)setError(data.message)
 }catch(e){setError(e instanceof Error?e.message:'Suivi indisponible.')}finally{setBusy(false)}}
 if(!record)return <Link className="receipt-delivery neutral" href={`/dashboard/quittances/${receiptId}#signature`}><Mail size={14}/>{unavailable?'Indisponible':'Non suivi'}</Link>
 return <div className="receipt-delivery-group"><button type="button" disabled={busy} onClick={()=>void refresh()} className={`receipt-delivery ${status==='delivered'?'delivered':['failed','bounced','complained'].includes(status??'')?'failed':'neutral'}`} title="Actualiser le statut fournisseur sans renvoyer le document">{busy?<RefreshCw size={14}/>:status==='delivered'?<CheckCircle2 size={14}/>:<Mail size={14}/>}<span>{busy?'Consultation…':({accepted:'À confirmer',delivered:'Délivré',bounced:'Non délivré',failed:'Refusé',complained:'Indésirable',reserved:'En cours',unknown:'Incertain'} as Record<string,string>)[status??'']||'À vérifier'}</span></button>{checked&&<small>Vérifié à {checked} · livraison technique, pas confirmation de lecture</small>}{error&&<p role="alert">{error}</p>}</div>
}
