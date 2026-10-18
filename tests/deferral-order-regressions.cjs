const fs=require('fs'),vm=require('vm'),assert=require('assert'),ts=require(process.cwd()+'/node_modules/typescript');
function load(file,mocks={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:n=>n in mocks?mocks[n]:require(n),Date,console});return exports}
const d=load('src/lib/loanDeferral.ts'),o=load('src/lib/cardOrder.ts');
const base={montant_emprunte:100000,taux_nominal:12,mensualite:2000,assurance_mensuelle:20,date_debut:'2026-01-01',date_fin:'2036-12-31',differe_debut:'2026-01-01',differe_fin:'2026-02-28'};
assert.equal(d.validateDeferral('total','2026-01-01','2028-12-31',0,'2026-01-01',null),null);
assert(d.validateDeferral('total','2026-01-01','2029-01-01',0,'2026-01-01',null));
assert(d.validateDeferral('partiel','2026-02-01','2026-01-01',100,'2026-01-01',null));
assert(d.validateDeferral('partiel','2025-12-01','2026-01-01',100,'2026-01-01',null));
assert(d.validateDeferral('total','2026-01-01','2026-02-28',null,'2026-01-01',null));
assert.equal(d.validateDeferral('aucun',null,null,null,null,null),null);
const performance=load('src/lib/investmentPerformance.ts',{'./loanDeferral':d});const normalBalance=performance.remainingLoanBalance({...base,differe_type:'aucun'},'2026-03-01');assert(Math.abs(normalBalance-(100000*Math.pow(1.01,3)-2000*(Math.pow(1.01,3)-1)/.01))<.001);
const partial={...base,differe_type:'partiel',differe_mensualite:1000},total={...base,differe_type:'total',differe_mensualite:0};
assert.equal(d.loanMonthlyCost(partial,'2026-02'),1020);assert.equal(d.loanMonthlyCost(total,'2026-02'),20);assert.equal(d.loanMonthlyCost(total,'2026-03'),2020);
assert.equal(d.loanMonthlyCost(total,'2025-12'),0);
assert.equal(d.loanMonthlyCost({...base,differe_type:'aucun'},'2025-12'),0);
assert.equal(d.loanMonthlyCost({...base,differe_type:'aucun'},'2037-01'),0);
assert.equal(d.loanCostForPeriod({...base,differe_type:'aucun',date_debut:'2026-03-01'},'2026-01-01','2026-03-31'),2020);
assert.equal(d.loanCostForPeriod(partial,'2026-01-01','2026-03-31'),4060);assert.equal(d.loanCostForPeriod(total,'2026-01-01','2026-03-31'),2060);
assert.equal(d.loanCostForPeriod({...base,differe_type:'aucun'},'2026-01-01','2026-03-31'),6060);
assert.equal(d.deferredBalance(partial,'2026-02-28'),100000);assert.equal(d.deferredBalance(partial,'2026-03-01'),99000);assert(Math.abs(d.deferredBalance(total,'2026-02-28')-102010)<.001);
assert.equal(d.validateDeferral('total','2024-02-29','2027-02-27',0,'2024-02-29',null),null);assert(d.validateDeferral('total','2024-02-29','2027-02-28',0,'2024-02-29',null));
assert.equal(o.orderedIds(['a','b','new'],['b','deleted','a']).join(','),'b,a,new');assert.equal(o.moveCard(['a','b','c'],1,-1).join(','),'b,a,c');assert.equal(o.moveCard(['a','b'],0,-1).join(','),'a,b');
// Les utilisateurs et scopes différents restent indépendants ; le serveur transmet uniquement au RPC du compte connecté.
let call;const fake={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},rpc:async(...args)=>{call=args;return{error:null}}};const a=load('src/components/cardOrderActions.ts',{'@/lib/supabase/server':{createClient:async()=>fake},'next/cache':{revalidatePath(){}}});
(async()=>{assert((await a.saveCardOrder('biens',['b','a'])).ok);assert.equal(call[0],'enregistrer_ordre_affichage');assert.equal(call[1].p_scope,'biens');assert.equal(call[1].p_ids.join(','),'b,a');call=null;assert((await a.saveCardOrder('biens',['a','a'])).error);assert.equal(call,null);console.log('Différé : partiel/total, 36 mois, dates, mensualité nulle, assurance, reprise et capital estimé : OK');console.log('Classement : déplacement, nouveaux éléments, éléments supprimés, sauvegarde et rejet doublons : OK')})().catch(e=>{console.error(e);process.exit(1)});
