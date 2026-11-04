import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
import {subscriptionPlans} from '@/lib/subscriptionPlans'
import {stripeLiveRequest,verifyStripeLiveEvent} from '@/lib/stripeLive'
export const runtime='nodejs'
export async function POST(req:NextRequest){
 let event:any
 try{const secret=process.env.STRIPE_LIVE_WEBHOOK_SECRET;if(!secret)throw Error();event=verifyStripeLiveEvent(await req.text(),req.headers.get('stripe-signature')||'',secret)}catch{return NextResponse.json({error:'Signature non vérifiée'},{status:400})}
 if(!['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(event.type))return NextResponse.json({received:true})
 try{
 const id=event.data?.object?.id;if(typeof id!=='string'||!/^sub_[a-zA-Z0-9]+$/.test(id))throw Error()
 const sub=await stripeLiveRequest(`subscriptions/${id}`),userId=sub.metadata?.ekolocs_user_id,plan=subscriptionPlans.find(p=>p.id===sub.metadata?.ekolocs_plan),interval=sub.metadata?.ekolocs_interval,item=sub.items?.data?.[0]
 if(!userId||!plan||!['month','year'].includes(interval)||sub.livemode!==true||sub.items?.data?.length!==1||item?.price?.id!==process.env[`STRIPE_LIVE_PRICE_${plan.id.toUpperCase()}_${String(interval).toUpperCase()}`]||item?.price?.currency!=='eur'||item?.price?.unit_amount!==(interval==='month'?plan.monthly:plan.yearly)||item?.price?.recurring?.interval!==interval)throw Error()
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw Error()
 const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{persistSession:false,autoRefreshToken:false}})
 const{data:access,error:ae}=await admin.from('account_access').select('kind').eq('user_id',userId).maybeSingle();if(ae||!access)throw Error()
 if(access.kind==='lifetime')return NextResponse.json({received:true})
 const{data:previous,error:pe}=await admin.from('billing_subscriptions').select('stripe_subscription_id').eq('user_id',userId).maybeSingle();if(pe)throw Error()
 if(previous&&previous.stripe_subscription_id!==sub.id){const other=await stripeLiveRequest(`subscriptions/${previous.stripe_subscription_id}`);if(other.created>sub.created)return NextResponse.json({received:true});if(!['canceled','incomplete_expired'].includes(other.status))throw Error('Abonnement existant')}
 const end=item.current_period_end??sub.current_period_end
 const{error}=await admin.from('billing_subscriptions').upsert({user_id:userId,stripe_subscription_id:sub.id,stripe_customer_id:typeof sub.customer==='string'?sub.customer:sub.customer.id,plan:plan.id,status:sub.status,interval,current_period_end:end?new Date(end*1000).toISOString():null,cancel_at_period_end:!!sub.cancel_at_period_end,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw Error()
 return NextResponse.json({received:true})
 }catch{return NextResponse.json({error:'Synchronisation à réessayer'},{status:503})}
}
