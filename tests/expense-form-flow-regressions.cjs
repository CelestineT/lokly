const assert=require('assert'),{loadSource}=require('./source-loader.cjs');let states=[],cursor=0,created=0,uploaded=0,fail=true,pushed='';const jsx=(type,props)=>({type,props:props||{}});
class Form{constructor(){}}
const db={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},storage:{from(){return {async upload(path){assert(path.startsWith('owner/depenses/created/'));uploaded++;return {error:fail?{message:'unavailable'}:null}}}}}};
const mocks={
 'react':{useState(v){const i=cursor++;if(!(i in states))states[i]=v;return[states[i],v=>states[i]=typeof v==='function'?v(states[i]):v]}},
 'react/jsx-runtime':{jsx,jsxs:jsx},'./ExpenseAttachments':{default:()=>null},'next/link':{default:'a'},
 'next/navigation':{useRouter:()=>({push:v=>pushed=v,refresh(){}})},
 './actions':{modifierDepense:async()=>({ok:true,id:'existing'})},
 './nouvelle/actions':{ajouterDepense:async()=>{created++;return{ok:true,id:'created'}}},
 '@/lib/supabase/client':{createClient:()=>db}
};
const C=loadSource('src/app/dashboard/depenses/ExpenseEditForm.tsx',mocks,{FormData:Form,crypto:{randomUUID:()=> 'uuid'}}).default;
function walk(n,a=[]){if(Array.isArray(n))n.forEach(x=>walk(x,a));else if(n&&typeof n==='object'){a.push(n);walk(n.props?.children,a)}return a}function draw(){cursor=0;return walk(C({expense:{},biens:[],create:true}))}
(async()=>{let nodes=draw();nodes.find(n=>n.props.type==='file').props.onChange({target:{files:[{name:'facture.pdf',size:123,type:'application/pdf'}]}});nodes=draw();await nodes.find(n=>n.type==='form').props.onSubmit({preventDefault(){},currentTarget:{}});assert.equal(created,1);assert.equal(uploaded,1);assert.equal(pushed,'');nodes=draw();assert(nodes.some(n=>n.props.role==='alert'));assert(nodes.some(n=>n.type==='fieldset'&&n.props.disabled));fail=false;await nodes.find(n=>n.type==='form').props.onSubmit({preventDefault(){},currentTarget:{}});assert.equal(created,1,'Une erreur de pièce jointe ne doit pas recréer la dépense');assert.equal(uploaded,2);assert.equal(pushed,'/dashboard/depenses');console.log('Pièce jointe dès la création et reprise après échec sans double dépense : OK')})().catch(e=>{console.error(e);process.exit(1)});
