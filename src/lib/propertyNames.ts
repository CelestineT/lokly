type PropertyName={nom?:string|null;nom_personnalise?:string|null}
export function propertyCustomName(bien:PropertyName|null|undefined){return bien?.nom_personnalise?.trim()||''}
export function propertyLabel(bien:PropertyName|null|undefined){return [bien?.nom?.trim(),propertyCustomName(bien)].filter(Boolean).join(' — ')}
// Older forms omit this field. Before the migration, an empty new field must
// also leave the existing property writable without referencing a missing column.
export function propertyNamePatch(fd:FormData){
 const type=String(fd.get('type')??'')
 if(type==='autre'&&!String(fd.get('nom_personnalise')??'').trim())throw new Error('Précisez le type de bien « Autre ».')
 if(fd.get('lots_json')){let lots;try{lots=JSON.parse(String(fd.get('lots_json')))}catch{throw new Error('Le détail des lots est invalide.')};if(Array.isArray(lots)&&lots.some(l=>!l||typeof l!=='object'||((l.type==='autre'||l.type_lot==='autre')&&!String(l.nom_personnalise??'').trim())))throw new Error('Précisez le type de chaque lot « Autre ».')}
 if(!fd.has('nom_personnalise'))return{}
 const value=String(fd.get('nom_personnalise')??'').trim()
 if(value.length>120)throw new Error('L’intitulé personnalisé ne doit pas dépasser 120 caractères.')
 return value||fd.get('nom_personnalise_charge')==='1'?{nom_personnalise:value||null}:{}
}
export function propertyNameSaveError(error:{code?:string;message?:string}){
 return /nom_personnalise/i.test(error.message??'')&&['PGRST204','42703'].includes(error.code??'')?'Le champ intitulé personnalisé nécessite la mise à jour SQL des noms de biens. Aucune modification de ce bien n’a été enregistrée.':error.message??'Enregistrement impossible.'
}
