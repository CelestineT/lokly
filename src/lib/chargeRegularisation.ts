export function parseChargeRegularisation(raw:unknown,period:unknown){
 const text=String(raw??'').trim().replace(',','.'),periode=String(period??'').trim()
 if(text&&!/^-?\d+(?:\.\d{1,2})?$/.test(text))return{error:'Saisissez une régularisation valide, avec deux décimales maximum.'}
 const montant=Number(text||0)
 if(!Number.isFinite(montant)||Math.abs(montant)>999999999.99)return{error:'Le montant de régularisation est invalide.'}
 if(montant!==0&&(!periode||periode.length>120))return{error:'Précisez la période de régularisation (120 caractères maximum).'}
 return{montant,periode:montant!==0?periode:null}
}
