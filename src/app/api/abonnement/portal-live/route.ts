import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {stripeLiveRequest,liveBillingReady} from '@/lib/stripeLive'
export const runtime='nodejs'
export async function POST(req:NextRequest){try{
 if(req.headers.get('origin')!=='https://app.ekolocs.fr')return NextResponse.json({error:'Origine non autorisée'},{status:403})
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:'Connexion nécessaire'},{status:401})
 if(!liveBillingReady())throw Error()
 const{data:a}=await s.from('account_access').select('kind').eq('user_id',user.id).maybeSingle()
 if(!a||a.kind==='lifetime')return NextResponse.json({error:'Aucun abonnement à gérer.'},{status:409})
 const{data:row,error}=await s.from('billing_subscriptions').select('stripe_customer_id').eq('user_id',user.id).maybeSingle();if(error||!row)throw Error()
 const session=await stripeLiveRequest('billing_portal/sessions',new URLSearchParams({customer:row.stripe_customer_id,configuration:process.env.STRIPE_LIVE_PORTAL_CONFIGURATION!,return_url:'https://app.ekolocs.fr/dashboard/abonnement'}))
 if(!session.url||new URL(session.url).origin!=='https://billing.stripe.com')throw Error()
 return NextResponse.json({url:session.url},{headers:{'Cache-Control':'private, no-store'}})
 }catch{return NextResponse.json({error:'Espace de gestion indisponible. Réessayez.'},{status:503})}}
