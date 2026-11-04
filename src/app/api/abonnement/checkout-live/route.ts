import {randomUUID} from 'node:crypto'
import {createClient as createAdminClient} from '@supabase/supabase-js'
import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {subscriptionPlans} from '@/lib/subscriptionPlans'
import {liveBillingReady,stripeLiveRequest,StripeLiveError} from '@/lib/stripeLive'
export const runtime='nodejs'
export async function POST(req:NextRequest){let stage='access';try{
 const origin='https://app.ekolocs.fr'
 if(req.headers.get('origin')!==origin)return NextResponse.json({error:'Origine non autorisée'},{status:403})
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:'Connexion nécessaire'},{status:401})
 if(!liveBillingReady())return NextResponse.json({error:'Les paiements réels ne sont pas encore disponibles.'},{status:503})
 const{data:access,error:ae}=await s.from('account_access').select('kind').eq('user_id',user.id).maybeSingle()
 if(ae||!access)throw Error('Accès à vérifier')
 if(access.kind==='lifetime')return NextResponse.json({error:'Votre accès est offert à vie. Aucun abonnement nécessaire.'},{status:409})
 const{plan,interval}=await req.json(),selected=subscriptionPlans.find(p=>p.id===plan)
 if(!selected||!['month','year'].includes(interval))return NextResponse.json({error:'Formule invalide'},{status:400})
 stage='subscription';
 const{data:existing,error:se}=await s.from('billing_subscriptions').select('status,stripe_customer_id').eq('user_id',user.id).maybeSingle()
 if(se)throw Error('Suivi abonnement indisponible')
 if(existing&&['active','trialing','past_due','unpaid','incomplete','paused'].includes(existing.status))return NextResponse.json({error:'Vous avez déjà un abonnement. Gérez-le depuis votre espace abonnement.'},{status:409})
 stage='account';
 const account=await stripeLiveRequest('account')
 if(account.id!==process.env.STRIPE_LIVE_ACCOUNT_ID||account.charges_enabled!==true)throw Error('Compte Stripe indisponible')
 const price=process.env[`STRIPE_LIVE_PRICE_${selected.id.toUpperCase()}_${String(interval).toUpperCase()}`]
 if(!price)throw Error('Catalogue incomplet')
 stage='price';
 const catalog=await stripeLiveRequest(`prices/${encodeURIComponent(price)}`)
 if(catalog.livemode!==true||!catalog.active||catalog.currency!=='eur'||catalog.unit_amount!==(interval==='month'?selected.monthly:selected.yearly)||catalog.recurring?.interval!==interval||catalog.recurring?.interval_count!==1||catalog.product!==`ekolocs_${selected.id}_v1`)throw Error('Tarif incorrect')
 const admin=createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}})
 stage='reservation';
 const token=randomUUID(),{data:reservation,error:re}=await admin.rpc('reserve_billing_checkout',{p_user_id:user.id,p_token:token})
 if(re||!reservation)throw Error('Réservation indisponible')
 if(reservation.state==='busy')return NextResponse.json({error:'Un paiement est en cours de préparation. Réessayez dans un instant.'},{status:409})
 if(reservation.state==='existing'){
 stage='pending_session';
 const pending=await stripeLiveRequest(`checkout/sessions/${encodeURIComponent(reservation.session_id)}`)
 if(pending.status==='open'&&pending.livemode===true&&reservation.plan===selected.id&&reservation.interval===interval)return NextResponse.json({url:reservation.url},{headers:{'Cache-Control':'private, no-store'}})
 return NextResponse.json({error:pending.status==='complete'?'Votre paiement est en cours de synchronisation. Actualisez votre abonnement dans un instant.':'Une session de paiement existe déjà pour une autre formule. Terminez-la ou attendez son expiration (30 minutes maximum).'},{status:409})
 }
 if(reservation.state!=='reserved')throw Error('Réservation invalide')
 const body=new URLSearchParams({mode:'subscription',locale:'fr',client_reference_id:user.id,success_url:`${origin}/dashboard/abonnement?retour=stripe`,cancel_url:`${origin}/dashboard/abonnement`,'line_items[0][quantity]':'1','line_items[0][price]':price,'subscription_data[billing_mode][type]':'flexible','subscription_data[metadata][ekolocs_user_id]':user.id,'subscription_data[metadata][ekolocs_plan]':selected.id,'subscription_data[metadata][ekolocs_interval]':interval,expires_at:String(Math.floor(Date.now()/1000)+1800)})
 if(existing?.stripe_customer_id)body.set('customer',existing.stripe_customer_id);else if(user.email)body.set('customer_email',user.email)
 stage='checkout';
 const result=await stripeLiveRequest('checkout/sessions',body,`ekolocs-live-session-${token}`)
 if(result.livemode!==true||!result.url||new URL(result.url).origin!=='https://checkout.stripe.com')throw Error('Session invalide')
 stage='save_session';
 const {error:saveError}=await admin.from('billing_checkout_sessions').update({session_id:result.id,session_url:result.url,expires_at:new Date(result.expires_at*1000).toISOString(),plan:selected.id,interval,lock_until:new Date().toISOString()}).eq('user_id',user.id).eq('token',token)
 if(saveError)throw Error('Session non enregistrée')
 return NextResponse.json({url:result.url},{headers:{'Cache-Control':'private, no-store'}})
 }catch(error){
 const reference=randomUUID().slice(0,8)
 console.error('live_checkout_failed',{reference,stage,...(error instanceof StripeLiveError?{stripeStatus:error.status,stripeCode:error.code,stripeRequestId:error.requestId,permission:error.permission}:{reason:error instanceof Error&&['Accès à vérifier','Suivi abonnement indisponible','Compte Stripe indisponible','Tarif incorrect','Réservation indisponible','Réservation invalide','Session invalide','Session non enregistrée'].includes(error.message)?error.message:'internal_error'})})
 const permissionDenied=error instanceof StripeLiveError&&error.status===403
 return NextResponse.json({error:permissionDenied?`La clé Stripe n’a pas l’autorisation nécessaire pour ouvrir le paiement. Référence : ${reference} (${stage}).`:`Impossible d’ouvrir le paiement. Référence : ${reference} (${stage}). Contactez contact@synteyapartners.com.`},{status:503})
 }}
