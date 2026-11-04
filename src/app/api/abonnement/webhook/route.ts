import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
import {subscriptionPlans} from '@/lib/subscriptionPlans'
import {testStripeKey,verifyStripeTestEvent,stripeTestRequest} from '@/lib/stripeTest'
export const runtime='nodejs'
export async function POST(req:NextRequest){
 let event:any
 try{testStripeKey();const secret=process.env.STRIPE_WEBHOOK_SECRET;if(!secret)throw Error();event=verifyStripeTestEvent(await req.text(),req.headers.get('stripe-signature')||'',secret)}catch{return NextResponse.json({error:'Événement de test non vérifié'},{status:400})}
 if(!['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(event.type))return NextResponse.json({received:true})
 try{
 const id=event.data?.object?.id;if(typeof id!=='string'||!/^sub_[a-zA-Z0-9]+$/.test(id))throw Error()
 // Fetch authoritative state instead of trusting a possibly delayed event snapshot.
 const sub=await stripeTestRequest(`subscriptions/${id}`),userId=sub.metadata?.ekolocs_user_id,plan=subscriptionPlans.find(p=>p.id===sub.metadata?.ekolocs_plan),interval=sub.metadata?.ekolocs_interval,item=sub.items?.data?.[0]?.price
 if(!userId||!plan||!['month','year'].includes(interval)||sub.livemode!==false||sub.items?.data?.length!==1||item?.currency!=='eur'||item?.unit_amount!==(interval==='month'?plan.monthly:plan.yearly)||item?.recurring?.interval!==interval)throw Error()
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw Error()
 const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{persistSession:false,autoRefreshToken:false}})
 const{data:access,error:ae}=await admin.from('account_access').select('kind').eq('user_id',userId).maybeSingle();if(ae||!access)throw Error();if(access.kind==='lifetime')return NextResponse.json({received:true})
 const{error}=await admin.from('billing_test_subscriptions').upsert({user_id:userId,stripe_subscription_id:sub.id,stripe_customer_id:sub.customer,plan:plan.id,status:sub.status,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw Error()
 return NextResponse.json({received:true})
 }catch{return NextResponse.json({error:'Synchronisation de test à réessayer'},{status:503})}
}
