/** Pagination complète. Une seule reprise pour les pannes transitoires, jamais pour un refus d’accès. */
export async function readAllRows(query:any):Promise<{data:any[];error:null}>{
 const result:any[]=[],ordered=query.order('id')
 for(let offset=0;;offset+=1000){
  let response:any
  for(let attempt=0;attempt<2;attempt++){
   try{response=await ordered.range(offset,offset+999)}catch(error){if(attempt===0&&error instanceof TypeError){await new Promise(r=>setTimeout(r,200));continue}throw error}
   const temporary=response.error&&(response.status===0||response.status===429||response.status>=500)
   if(attempt===0&&temporary){await new Promise(r=>setTimeout(r,200));continue}break
  }
  const {data,error}=response
  if(error)throw new Error('Impossible de charger toutes les données nécessaires au calcul. Réessayez.')
  if(!data)return{data:result,error:null};result.push(...data);if(data.length<1000)return{data:result,error:null}
 }
}
