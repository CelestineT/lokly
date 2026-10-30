export const EXPENSE_CATEGORIES:Record<string,string>={travaux:'Travaux',charges:'Charges',frais_copropriete:'Frais de Copropriété',charge_copropriete:'Charge de Copropriété',assurance:'Assurance',gestion:'Gestion',taxe:'Taxes',autre:'Autre'}
const PREFIX='autre:'
export const expenseCategoryKey=(value:string)=>value.startsWith(PREFIX)?'autre':value
export const expenseCustomName=(value:string)=>value.startsWith(PREFIX)?value.slice(PREFIX.length):''
export const expenseCategoryLabel=(value:string)=>expenseCustomName(value)||EXPENSE_CATEGORIES[value]||value
export function expenseCategoryFromForm(form:FormData){const category=String(form.get('categorie')??'');if(!Object.hasOwn(EXPENSE_CATEGORIES,category))throw Error('Choisissez une catégorie de dépense.');if(category!=='autre')return category;const name=String(form.get('categorie_autre')??'').trim();if(!name||name.length>120)throw Error('Précisez la dépense « Autre » (120 caractères maximum).');return PREFIX+name}
