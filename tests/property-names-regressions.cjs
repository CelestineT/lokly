const assert=require('assert'),fs=require('fs'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{loadSource}=require('./source-loader.cjs');
const names=loadSource('src/lib/propertyNames.ts');
const noop=()=>null,link={__esModule:true,default:({children,...p})=>React.createElement('a',p,children)};
function fd(type,custom,loaded){const f=new FormData();for(const[k,v]of Object.entries({type,nom:'Résidence existante',adresse:'12 Exemple',ville:'Reims',code_postal:'51100'}))f.set(k,v);if(custom!==undefined)f.set('nom_personnalise',custom);if(loaded!==undefined)f.set('nom_personnalise_charge',loaded);return f}
function db(owner='owner') {const writes=[],filters=[];return{writes,filters,auth:{getUser:async()=>({data:{user:owner?{id:owner}:null}})},from(table){let q;q=new Proxy({},{get(_,key){if(key==='then')return resolve=>Promise.resolve({data:{id:'bien'},error:null}).then(resolve);return(...a)=>{if(key==='insert'||key==='update')writes.push({table,method:key,row:a[0]});if(key==='eq')filters.push(a);return q}}});return q}}}
(async()=>{
 for(const type of ['appartement','maison','studio','immeuble','immeuble_rapport','parking','box','garage','cave','local_commercial','autre']){
  const d=db(),mocks={'@/lib/supabase/server':{createClient:async()=>d},'next/cache':{revalidatePath(){}},'next/navigation':{redirect(){throw Error('REDIRECT')}}};
  const add=loadSource('src/app/dashboard/biens/nouveau/actions.ts',mocks).ajouterBien;
  await assert.rejects(()=>add(fd(type,'  T2 Jardin  ')),/REDIRECT/);assert.equal(d.writes.length,1);assert.equal(d.writes[0].row.nom,'Résidence existante');assert.equal(d.writes[0].row.nom_personnalise,'T2 Jardin');assert.equal(d.writes[0].row.type,type);
  const edit=loadSource('src/app/dashboard/biens/[id]/modifier/actions.ts',mocks).modifierBien;
  assert((await edit('bien',fd(type,'Garage droite','1'))).ok);assert.equal(d.writes.at(-1).row.nom_personnalise,'Garage droite');assert(d.filters.some(([k,v])=>k==='proprietaire_id'&&v==='owner'));
 }
 assert(!('nom_personnalise' in names.propertyNamePatch(fd('appartement',undefined))),'Une ancienne version du formulaire ne doit pas effacer le nouvel intitulé');
 assert(!('nom_personnalise' in names.propertyNamePatch(fd('appartement','','0'))),'Avant migration, les anciennes données restent modifiables');
 assert.equal(names.propertyNamePatch(fd('appartement','','1')).nom_personnalise,null,'Effacer volontairement un intitulé doit être enregistré');
 assert.throws(()=>names.propertyNamePatch(fd('appartement','x'.repeat(121))),/120/);
 assert.equal(names.propertyLabel({nom:'Arcueil',nom_personnalise:'T2 Jardin'}),'Arcueil — T2 Jardin');assert.equal(names.propertyLabel({nom:'Arcueil'}),'Arcueil');
 const d=db(null),edit=loadSource('src/app/dashboard/biens/[id]/modifier/actions.ts',{'@/lib/supabase/server':{createClient:async()=>d},'next/cache':{revalidatePath(){}}}).modifierBien;assert((await edit('bien',fd('appartement','Test'))).error);assert.equal(d.writes.length,0);
 const Form=loadSource('src/app/dashboard/biens/[id]/modifier/ModifierBienForm.tsx',{'next/link':link,'next/navigation':{useRouter:()=>({push(){}})},'./LotsEditor':{__esModule:true,default:noop},'@/lib/supabase/client':{createClient(){throw Error('No network during render')}}}).default;
 for(const type of ['appartement','maison','studio','immeuble','immeuble_rapport','parking','box','garage','cave','local_commercial','autre']){const html=renderToStaticMarkup(React.createElement(Form,{bien:{id:'bien',nom:'Arcueil',nom_personnalise:'T2 Jardin',type}}));assert(html.indexOf('Nom du bien')<html.indexOf('Intitulé personnalisé du bien'));assert(html.includes('value="Arcueil"'));assert(html.includes('value="T2 Jardin"'));assert(html.includes('name="nom_personnalise_charge" value="1"'))}
 const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');const pg=new PGlite();await pg.exec("create table public.biens(id text primary key, nom text);insert into public.biens values ('existing','Arcueil');");const sql=fs.readFileSync('supabase/migrations/20261026_intitule_personnalise_biens.sql','utf8');await pg.exec(sql);await pg.exec(sql);const rows=(await pg.query('select * from public.biens')).rows;assert.equal(rows.length,1);assert.equal(rows[0].nom,'Arcueil');assert.equal(rows[0].nom_personnalise,null);await pg.close();
 console.log('Noms de biens : deux champs distincts pour 11 types, création/modification/effacement, anciens formulaires, contrôle propriétaire, rendu et migration rejouable sans modification des données : OK');
})().catch(e=>{console.error(e);process.exit(1)});
