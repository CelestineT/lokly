/** Supabase paginates responses; never treat its first page as a financial total. */
export async function readAllRows(query:any):Promise<{data:any[];error:null}>{
 const result:any[]=[],ordered=query.order('id');for(let offset=0;;offset+=1000){const{data,error}=await ordered.range(offset,offset+999);if(error)throw new Error('Impossible de charger toutes les données nécessaires au calcul. Réessayez.');if(!data)return{data:result,error:null};result.push(...data);if(data.length<1000)return{data:result,error:null}}
}
