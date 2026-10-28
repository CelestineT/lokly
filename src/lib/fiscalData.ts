import {createClient} from '@/lib/supabase/server'
import {loadPropertyPerformanceData} from '@/lib/propertyPerformanceData'
export async function loadFiscalData(){
 const data=await loadPropertyPerformanceData(),s=await createClient(),{data:{user}}=await s.auth.getUser();let receiptIds:string[]|null=null
 if(user)try{const ids:string[]=[];for(let offset=0;;offset+=1000){const{data:folders,error}=await s.storage.from('documents').list(`${user.id}/depenses`,{limit:1000,offset});if(error)throw error;for(const folder of folders??[])if(!folder.id)ids.push(folder.name);if(!folders||folders.length<1000)break}receiptIds=ids}catch{}
 return {data,receiptIds}
}
