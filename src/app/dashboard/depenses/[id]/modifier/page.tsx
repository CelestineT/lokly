import {notFound,redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import ExpenseEditForm from '../../ExpenseEditForm'
export default async function Page({params}:{params:Promise<{id:string}>}){
 const{id}=await params,s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)redirect('/login')
 const[{data:d,error},{data:biens,error:biensError}]=await Promise.all([s.from('depenses').select('*').eq('id',id).eq('proprietaire_id',user.id).maybeSingle(),s.from('biens').select('id,nom,ville').eq('proprietaire_id',user.id).order('nom')]);if(error||biensError)throw new Error('Impossible de charger la dépense et ses biens.');if(!d)notFound()
 return <ExpenseEditForm expense={d} biens={biens??[]}/>
}
