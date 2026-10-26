// Une seule présentation par lot. Le dernier rattachement applicable prévaut.
// Aucun enregistrement historique n'est supprimé.
export function uniqueAnnexes<T extends {lot_id:string;date_debut?:string;id?:string}>(rows:T[]):T[]{const result=new Map<string,T>();for(const row of rows){const old=result.get(row.lot_id);if(!old||(row.date_debut??'')>(old.date_debut??'')||((row.date_debut??'')===(old.date_debut??'')&&(row.id??'')>(old.id??'')))result.set(row.lot_id,row)}return [...result.values()]}
export function includedAnnexes(values:unknown):string[]{const labels:Record<string,string>={box:'Box',garage:'Garage',parking:'Parking',cave:'Cave',balcon:'Balcon',terrasse:'Terrasse',grenier:'Grenier',cour:'Cour',jardin:'Jardin'};return Array.isArray(values)?[...new Set(values.filter((v):v is string=>typeof v==='string').map(v=>labels[v]||v))]:[]}

export function annexeMonthBounds(month:string){if(!/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month))return null;const[y,m]=month.split('-').map(Number);return{start:`${month}-01`,end:new Date(Date.UTC(y,m,0)).toISOString().slice(0,10)}}
/** Resolve the latest applicable version BEFORE testing its end date.
 * Otherwise an old open version may reappear when a more recent version was closed. */
export function annexesForMonth<T extends {lot_id:string;date_debut:string;date_fin?:string|null;id?:string}>(rows:T[],month:string):T[]{const bounds=annexeMonthBounds(month);if(!bounds)throw Error('Choisissez un mois valide.');return uniqueAnnexes(rows.filter(a=>a.date_debut<=bounds.end)).filter(a=>!a.date_fin||a.date_fin>=bounds.start)}
