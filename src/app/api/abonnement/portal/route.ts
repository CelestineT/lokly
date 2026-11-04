import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {stripeTestRequest} from '@/lib/stripeTest'
export const runtime='nodejs'
export async function POST(){try{
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:'Connexion nécessaire'},{status:401})
 const{data:a,error:ae}=await s.from('account_access').select('kind').eq('user_id',user.id).maybeSingle();if(ae||!a)throw Error();if(a.kind==='lifetime')return NextResponse.json({error:'Aucun abonnement à gérer : accès offert à vie.'},{status:409})
 const{data:row,error}=await s.from('billing_test_subscriptions').select('stripe_customer_id').eq('user_id',user.id).maybeSingle()
 if(error||!row||!process.env.STRIPE_PORTAL_CONFIGURATION)throw Error()
 const session=await stripeTestRequest('billing_portal/sessions',new URLSearchParams({customer:row.stripe_customer_id,configuration:process.env.STRIPE_PORTAL_CONFIGURATION,return_url:'https://app.ekolocs.fr/dashboard/abonnement'}))
 if(!session.url?.startsWith('https://billing.stripe.com/'))throw Error()
 return NextResponse.json({url:session.url},{headers:{'Cache-Control':'private, no-store'}})
 }catch{return NextResponse.json({error:'Portail de test indisponible.'},{status:503})}}
