import {createHash} from 'node:crypto'
import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {subscriptionPlans,subscriptionTestReady} from '@/lib/subscriptionPlans'
import {stripeTestRequest} from '@/lib/stripeTest'
export const runtime='nodejs'
export async function POST(req:NextRequest){try{
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:'Connexion nécessaire'},{status:401})
 if(!subscriptionTestReady())return NextResponse.json({error:'Le paiement de test n’est pas encore configuré.'},{status:503})
 const{data:access,error}=await s.from('account_access').select('kind').eq('user_id',user.id).maybeSingle();if(error||!access)return NextResponse.json({error:'Accès à vérifier avant paiement.'},{status:503});if(access.kind==='lifetime')return NextResponse.json({error:'Votre accès est offert à vie. Aucun abonnement nécessaire.'},{status:409})
 const{plan,interval}=await req.json();const selected=subscriptionPlans.find(p=>p.id===plan);if(!selected||!['month','year'].includes(interval))return NextResponse.json({error:'Formule invalide'},{status:400})
 const{data:existing,error:se}=await s.from('billing_test_subscriptions').select('status').eq('user_id',user.id).maybeSingle();if(se)return NextResponse.json({error:'Suivi abonnement indisponible'},{status:503});if(existing&&['active','trialing','past_due','unpaid','incomplete','paused'].includes(existing.status))return NextResponse.json({error:'Un abonnement de test existe déjà. Gérez-le depuis Stripe pendant la recette.'},{status:409})
 const origin='https://app.ekolocs.fr',amount=interval==='month'?selected.monthly:selected.yearly
 const price=process.env[`STRIPE_PRICE_${selected.id.toUpperCase()}_${String(interval).toUpperCase()}`]
 if(!price||!process.env.STRIPE_ACCOUNT_ID)throw Error('Catalogue incomplet')
 const account=await stripeTestRequest('account');if(account.id!==process.env.STRIPE_ACCOUNT_ID)throw Error('Compte Stripe incorrect')
 const catalog=await stripeTestRequest(`prices/${encodeURIComponent(price)}`)
 if(catalog.livemode!==false||!catalog.active||catalog.currency!=='eur'||catalog.unit_amount!==amount||catalog.recurring?.interval!==interval||catalog.product!==`ekolocs_${selected.id}_v1`)throw Error('Tarif incorrect')
 const body=new URLSearchParams({mode:'subscription',locale:'fr',client_reference_id:user.id,success_url:`${origin}/dashboard/abonnement?retour=stripe`,cancel_url:`${origin}/dashboard/abonnement`,'line_items[0][quantity]':'1','line_items[0][price]':price,'subscription_data[billing_mode][type]':'flexible',integration_identifier:'ekolocs_'+Array.from(createHash('sha256').update(user.id).digest().subarray(0,8),v=>String.fromCharCode(97+v%26)).join(''),'subscription_data[metadata][ekolocs_user_id]':user.id,'subscription_data[metadata][ekolocs_plan]':selected.id,'subscription_data[metadata][ekolocs_interval]':interval})
 if(user.email)body.set('customer_email',user.email)
 // A single open session per owner for this 30-minute window, across all plans.
 const result=await stripeTestRequest('checkout/sessions',body,`ekolocs-test-${user.id}-${Math.floor(Date.now()/1800000)}`)
 if(result.livemode!==false||!result.url?.startsWith('https://checkout.stripe.com/'))throw Error('Session invalide')
 return NextResponse.json({url:result.url},{headers:{'Cache-Control':'private, no-store'}})
 }catch{return NextResponse.json({error:'Paiement de test indisponible. Aucun paiement réel effectué.'},{status:503})}}
