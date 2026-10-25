'use client'
import {useEffect,useState} from 'react'
import {createClient} from './supabase/client'
import {loadBailAnnexes,type AnnexeLoad} from './loadBailAnnexes'
export function useBailAnnexes(bailId:string|null|undefined,bienId:string|undefined,month:string){
 const[version,setVersion]=useState(0),[snapshot,setSnapshot]=useState<{key:string;data:AnnexeLoad;error:string|null;loading:boolean}>({key:'',data:{rows:[],history:[]},error:null,loading:false}),key=bailId?`${bailId}|${bienId??''}|${month}|${version}`:''
 useEffect(()=>{let cancelled=false;if(!bailId){setSnapshot({key:'',data:{rows:[],history:[]},error:null,loading:false});return}setSnapshot({key,data:{rows:[],history:[]},error:null,loading:true});loadBailAnnexes(createClient(),bailId,bienId??'',month).then(data=>{if(!cancelled)setSnapshot({key,data,error:null,loading:false})}).catch(e=>{if(!cancelled)setSnapshot({key,data:{rows:[],history:[]},error:e instanceof Error?e.message:'Impossible de charger les annexes.',loading:false})});return()=>{cancelled=true}},[key,bailId,bienId,month])
 const ready=!bailId||snapshot.key===key&&!snapshot.loading&&!snapshot.error
 return{rows:snapshot.key===key?snapshot.data.rows:[],history:snapshot.key===key?snapshot.data.history:[],loading:!!bailId&&(snapshot.key!==key||snapshot.loading),error:snapshot.key===key?snapshot.error:null,ready,reload:()=>setVersion(n=>n+1)}
}
