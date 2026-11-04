import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {subscriptionPlans} from '@/lib/subscriptionPlans'
import {liveBillingReady,stripeLiveRequest} from '@/lib/stripeLive'
export const runtime='nodejs'
export async function POST(req:NextRequest){try{
 const origin='https://app.ekolocs.fr'
 if(req.headers.get('origin')!==origin)return NextResponse.json({error:'Origine non autorisée'},{status:403})
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:'Connexion nécessaire'},{status:401})
 if(!liveBillingReady())return NextResponse.json({error:'Les paiements réels ne sont pas encore disponibles.'},{status:503})
 const{data:access,error:ae}=await s.from('account_access').select('kind').eq('user_id',user.id).maybeSingle()
 if(ae||!access)throw Error('Accès à vérifier')
 if(access.kind==='lifetime')return NextResponse.json({error:'Votre accès est offert à vie. Aucun abonnement nécessaire.'},{status:409})
 const{plan,interval}=await req.json(),selected=subscriptionPlans.find(p=>p.id===plan)
 if(!selected||!['month','year'].includes(interval))return NextResponse.json({error:'Formule invalide'},{status:400})
 const{data:existing,error:se}=await s.from('billing_subscriptions').select('status,stripe_customer_id').eq('user_id',user.id).maybeSingle()
 if(se)throw Error('Suivi abonnement indisponible')
 if(existing&&['active','trialing','past_due','unpaid','incomplete','paused'].includes(existing.status))return NextResponse.json({error:'Vous avez déjà un abonnement. Gérez-le depuis votre espace abonnement.'},{status:409})
 const account=await stripeLiveRequest('account')
 if(account.id!==process.env.STRIPE_LIVE_ACCOUNT_ID||account.charges_enabled!==true)throw Error('Compte Stripe indisponible')
 const price=process.env[`STRIPE_LIVE_PRICE_${selected.id.toUpperCase()}_${String(interval).toUpperCase()}`]
 if(!price)throw Error('Catalogue incomplet')
 const catalog=await stripeLiveRequest(`prices/${encodeURIComponent(price)}`)
 if(catalog.livemode!==true||!catalog.active||catalog.currency!=='eur'||catalog.unit_amount!==(interval==='month'?selected.monthly:selected.yearly)||catalog.recurring?.interval!==interval||catalog.recurring?.interval_count!==1||catalog.product!==`ekolocs_${selected.id}_v1`)throw Error('Tarif incorrect')
 const body=new URLSearchParams({mode:'subscription',locale:'fr',client_reference_id:user.id,success_url:`${origin}/dashboard/abonnement?retour=stripe`,cancel_url:`${origin}/dashboard/abonnement`,'line_items[0][quantity]':'1','line_items[0][price]':price,'subscription_data[billing_mode][type]':'flexible','subscription_data[metadata][ekolocs_user_id]':user.id,'subscription_data[metadata][ekolocs_plan]':selected.id,'subscription_data[metadata][ekolocs_interval]':interval,'payment_method_types[0]':'card'})
 if(existing?.stripe_customer_id)body.set('customer',existing.stripe_customer_id);else if(user.email)body.set('customer_email',user.email)
 const result=await stripeLiveRequest('checkout/sessions',body,`ekolocs-live-${user.id}-${Math.floor(Date.now()/1800000)}`)
 if(result.livemode!==true||!result.url||new URL(result.url).origin!=='https://checkout.stripe.com')throw Error('Session invalide')
 return NextResponse.json({url:result.url},{headers:{'Cache-Control':'private, no-store'}})
 }catch{return NextResponse.json({error:'Impossible d’ouvrir le paiement. Réessayez ou contactez contact@synteyapartners.com.'},{status:503})}}
