'use client'
import {groupSmsHistory,smsCampaignDate,type SmsHistoryRecord,type SmsHistoryGroup} from '@/lib/smsHistory'
type Props={records:SmsHistoryRecord[];activeCampaignId:string|null;busy:boolean;onRefresh:(id:string)=>void}
function Campaign({group,current,busy,onRefresh}:{group:SmsHistoryGroup;current?:boolean;busy:boolean;onRefresh:Props['onRefresh']}){
 const rows=<ul className="sms-history-rows">{group.records.map(r=><li key={r.id}>
  <div className="sms-history-recipient"><b>•••• {r.last4}</b><span>{r.label}</span></div>
  <p className="sms-history-meta">{r.segments} segment(s){r.errorCode?` · Code ${r.errorCode}`:''}</p>
  {r.hasSid&&<button type="button" disabled={busy} onClick={()=>onRefresh(r.id)} className="sms-history-refresh">Actualiser sans renvoyer</button>}
  {['reserved','sending','unknown'].includes(r.status)&&<p className="sms-history-warning">Vérifiez le suivi ou la console Twilio avant de créer une campagne identique pour ce numéro.</p>}
 </li>)}</ul>
 const heading=<><strong>{current?'Campagne en cours de suivi':group.id==='legacy'?'Envois précédents':'Campagne SMS'}</strong><span className="sms-history-date">{smsCampaignDate(group.createdAt)}</span><span className="sms-history-count">{group.records.length} SMS affiché(s)</span><span className="sms-history-totals"><span>{group.delivered} réception(s) confirmée(s)</span><span>{group.failed} non remis ou annulé(s)</span>{group.pending>0&&<span>{group.pending} en cours ou à vérifier</span>}</span></>
 return current?<section className="sms-history-campaign sms-history-current"><div className="sms-history-heading">{heading}</div>{rows}</section>:<details className="sms-history-campaign"><summary>{heading}</summary>{rows}</details>
}
export default function SmsHistory({records,activeCampaignId,busy,onRefresh}:Props){
 const groups=groupSmsHistory(records),current=groups.find(g=>g.id===activeCampaignId),past=groups.filter(g=>g.id!==activeCampaignId)
 return <div className="sms-history"><h3 className="mt-5 font-semibold">Suivi des envois</h3>
  {records.length===0?<p className="mt-2 text-sm">Aucun envoi réel enregistré.</p>:<>
   {current&&<Campaign group={current} current busy={busy} onRefresh={onRefresh}/>}
   {past.length>0&&<details className="sms-history-archive"><summary>Historique des campagnes <span>({past.length})</span></summary><p className="sms-history-hint">Ouvrez une campagne pour voir les résultats par numéro. Au chargement de la page, les 50 derniers SMS sont affichés.</p><div className="sms-history-groups">{past.map(group=><Campaign key={group.id} group={group} busy={busy} onRefresh={onRefresh}/>)}</div></details>}
  </>}
 </div>
}
