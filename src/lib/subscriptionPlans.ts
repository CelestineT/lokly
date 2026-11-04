export const subscriptionPlans = [
 {id:'essentiel',name:'Essentiel',limit:2,monthly:490,yearly:4900},
 {id:'patrimoine',name:'Patrimoine',limit:10,monthly:990,yearly:9900},
 {id:'investisseur',name:'Investisseur',limit:25,monthly:1990,yearly:19900},
] as const
export const subscriptionMoney=(cents:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(cents/100)
export function subscriptionTestReady(env=process.env){return env.BILLING_MODE==='test'&&!!env.STRIPE_SECRET_KEY&&/^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY)&&!!env.STRIPE_WEBHOOK_SECRET&&!!env.SUPABASE_SERVICE_ROLE_KEY}
