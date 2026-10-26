import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'}
export async function POST(req:NextRequest){
 try{
  if(Number(req.headers.get('content-length')??0)>1024)return NextResponse.json({error:'Requête invalide'},{status:400,headers})
  const body=await req.text();if(body.length>1024)return NextResponse.json({error:'Requête invalide'},{status:400,headers});const {token}=JSON.parse(body)
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return NextResponse.json({error:'Document introuvable'},{status:404,headers})
  // Anonymous client: no owner session and no administrator key on the public endpoint.
  const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data,error}=await s.rpc('verifier_version_quittance',{p_token:token})
  if(error)return NextResponse.json({error:'Vérification momentanément indisponible. Réessayez plus tard.'},{status:503,headers})
  if(!data)return NextResponse.json({error:'Ce code ne correspond à aucun document enregistré.'},{status:404,headers})
  // Explicit allow-list, even if the database function changes later.
  const {reference,statut,mois,date_signature,total,total_paye,montant_impaye,cree_le}=data
  return NextResponse.json({reference,statut,mois,date_signature,total,total_paye,montant_impaye,cree_le},{headers})
 }catch{return NextResponse.json({error:'Vérification indisponible. Vérifiez le code ou réessayez.'},{status:400,headers})}
}
