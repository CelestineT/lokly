type Acquisition={prix_achat?:number|string|null;frais_notaire?:number|string|null;frais_agence?:number|string|null;frais_courtage?:number|string|null;autres_frais_acquisition?:number|string|null}
export function acquisitionCosts(bien:Acquisition,financement?:{postes_finances?:unknown}|null){
 const number=(value:unknown)=>{const n=Number(value??0);return Number.isFinite(n)?n:0};
 const base=number(bien.prix_achat)+number(bien.frais_notaire)+number(bien.frais_agence)+number(bien.frais_courtage)+number(bien.autres_frais_acquisition);
 const labels:Record<string,string>={travaux:'Travaux financés',terrain:'Terrain financé',mobilier:'Mobilier financé',equipement:'Équipement financé',autre:'Autre élément financé'};
 const elements=Array.isArray(financement?.postes_finances)?financement.postes_finances.filter(p=>p&&typeof p==='object').map((p:any)=>({label:typeof p.libelle==='string'&&p.libelle.trim()?`${labels[p.type]??'Élément financé'} — ${p.libelle.trim()}`:labels[p.type]??'Élément financé',montant:number(p.montant)})):[];
 return {base,elements,totalElements:elements.reduce((s,p)=>s+p.montant,0),total:base+elements.reduce((s,p)=>s+p.montant,0)};
}
