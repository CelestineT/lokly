// Payments belong to a lease: never split them between its dwelling and annexes.
type Property={id:string}
type Unit={id:string;bien_id:string}
type Lease={id:string;bien_id:string;lot_id:string|null}
type Tenant={id:string;bail_id?:string|null;bien_id?:string|null}
type Receipt={bien_id:string|null;locataire_id:string}
type Cost={bien_id:string|null}
export type UnitAssignment={lot_id:string;bail_id:string;date_debut:string;date_fin:string|null;prix_mensuel:number}
export function dashboardScope<B extends Property,L extends Unit,A extends Lease,T extends Tenant,P extends Receipt,Q extends Receipt,D extends Cost,F extends Cost>(data:{biens:B[];lots:L[];baux:A[];locataires:T[];paiements:P[];quittances:Q[];depenses:D[];financements:F[];affectations:UnitAssignment[]},bienId:string,lotId:string,from:string,to:string){
 const selectedLot=lotId?data.lots.find(l=>l.id===lotId&&l.bien_id===bienId):null
 const validLot=!lotId||!!selectedLot
 const biens=data.biens.filter(b=>(!bienId||b.id===bienId)&&validLot),propertyIds=new Set(biens.map(b=>b.id))
 const linkedLeases=new Set(data.affectations.filter(a=>a.lot_id===lotId&&a.date_debut<=to&&(!a.date_fin||a.date_fin>=from)).map(a=>a.bail_id))
 const baux=data.baux.filter(b=>propertyIds.has(b.bien_id)&&(!lotId||b.lot_id===lotId||linkedLeases.has(b.id))),leaseIds=new Set(baux.map(b=>b.id))
 const locataires=data.locataires.filter(t=>lotId?!!t.bail_id&&leaseIds.has(t.bail_id):!bienId||!!t.bien_id&&propertyIds.has(t.bien_id)||!!t.bail_id&&leaseIds.has(t.bail_id))
 const tenantIds=new Set(locataires.map(t=>t.id)),tenants=new Map(data.locataires.map(t=>[t.id,t]))
 const propertyFor=(row:Receipt)=>{const tenant=tenants.get(row.locataire_id);return row.bien_id??tenant?.bien_id??data.baux.find(b=>b.id===tenant?.bail_id)?.bien_id??null}
 const belongs=(row:Receipt)=>{if(!validLot)return false;if(!bienId)return true;if(lotId)return tenantIds.has(row.locataire_id);const property=propertyFor(row);return !!property&&propertyIds.has(property)}
 return {biens,lots:data.lots.filter(l=>propertyIds.has(l.bien_id)&&(!lotId||l.id===lotId)),baux,locataires,paiements:data.paiements.filter(belongs).map(p=>({...p,bien_id:propertyFor(p)})),quittances:data.quittances.filter(belongs).map(q=>({...q,bien_id:propertyFor(q)})),depenses:lotId?[]:data.depenses.filter(d=>!bienId||!!d.bien_id&&propertyIds.has(d.bien_id)),financements:lotId?[]:data.financements.filter(f=>!bienId||!!f.bien_id&&propertyIds.has(f.bien_id))}
}
