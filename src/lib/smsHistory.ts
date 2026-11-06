export type SmsHistoryRecord={id:string;campaignId?:string|null;createdAt?:string|null;status:string;label:string;last4:string;segments:number;hasSid:boolean;errorCode:string|null}
export type SmsHistoryGroup={id:string;createdAt:string|null;records:SmsHistoryRecord[];delivered:number;failed:number;pending:number}
const dateValue=(v?:string|null)=>v&&Number.isFinite(Date.parse(v))?Date.parse(v):0
export function mergeSmsRecords(previous:SmsHistoryRecord[],incoming:SmsHistoryRecord[]):SmsHistoryRecord[]{
 const records=new Map(previous.map(r=>[r.id,r]))
 for(const r of incoming)records.set(r.id,{...records.get(r.id),...r})
 return [...records.values()]
}
export function groupSmsHistory(records:SmsHistoryRecord[]):SmsHistoryGroup[]{
 const groups=new Map<string,SmsHistoryGroup>()
 for(const r of records){
  const id=r.campaignId??'legacy',group=groups.get(id)??{id,createdAt:null,records:[],delivered:0,failed:0,pending:0}
  if(dateValue(r.createdAt)>dateValue(group.createdAt))group.createdAt=r.createdAt??null
  group.records.push(r)
  if(r.status==='delivered')group.delivered++
  else if(['undelivered','failed','canceled'].includes(r.status))group.failed++
  else group.pending++
  groups.set(id,group)
 }
 return [...groups.values()].sort((a,b)=>dateValue(b.createdAt)-dateValue(a.createdAt))
}
export function smsCampaignDate(value:string|null):string{
 if(!dateValue(value))return 'Date non disponible'
 return new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Paris'}).format(new Date(value!))
}
