const assert=require('assert');const {loadSource}=require('./source-loader.cjs');
let values=[],cursor=0,effects=[],updates=[],verificationFails=false,fail=false,logout=null,redirect=null;
const user={id:'owner-test',email:'owner@example.test',user_metadata:{prenom:'Camille',nom:'Exemple'}};
const react={useState(initial){const i=cursor++;if(!(i in values))values[i]=initial;return [values[i],v=>values[i]=v]},useEffect(fn){effects.push(fn)}};
const jsx=(type,props)=>({type,props:props||{}});
const auth={getUser:async()=>({data:{user},error:null}),updateUser:async payload=>{updates.push(payload);return fail?{error:Error('Échec simulé')}:{data:{user},error:null}},signInWithPassword:async()=>verificationFails?{data:{user:null},error:Error('Refus')}:{data:{user},error:null},signOut:async scope=>{logout=scope;return {error:null}}};
const component=loadSource('src/app/dashboard/compte/page.tsx',{'react':react,'react/jsx-runtime':{jsx,jsxs:jsx},'next/link':()=>null,'next/navigation':{useRouter:()=>({replace:p=>redirect=p,refresh(){}})},'@/lib/supabase/client':{createClient:()=>({auth,from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:{prenom:'Autre',nom:'Bailleur'},error:null})})})}}, {window:{location:{origin:'https://preview.example.test',search:''}}}).default;
function nodes(n,out=[]){if(Array.isArray(n))n.forEach(v=>nodes(v,out));else if(n&&typeof n==='object'){out.push(n);nodes(n.props?.children,out)}return out}
const draw=()=>{cursor=0;return nodes(component())};const text=n=>typeof n==='string'?n:Array.isArray(n)?n.map(text).join(''):text(n?.props?.children||'');
const button=label=>draw().find(n=>n.type==='button'&&text(n)===label);const input=(id,value)=>draw().find(n=>n.props.id===id).props.onChange({target:{value}});const submit=async id=>{const form=draw().find(n=>n.type==='form'&&nodes(n).some(c=>c.props?.id===id));await form.props.onSubmit({preventDefault(){}})};
(async()=>{draw();effects[0]();await new Promise(r=>setImmediate(r));assert(draw().some(n=>n.type==='h2'&&text(n)==='Camille Exemple'));
input('account-first','Camille modifiée');await submit('account-first');assert.deepEqual(updates[0],{data:{prenom:'Camille modifiée',nom:'Exemple'}});assert(!('email' in updates[0]));
button('Modifier mon adresse e-mail').props.onClick();input('account-email','new@example.test');await submit('account-email');assert.deepEqual(updates[1],{email:'new@example.test'});assert(draw().some(n=>n.props.className==='account-pending'));assert(draw().some(n=>n.props.className==='account-identity'&&text(n).includes('owner@example.test')));
button('Modifier mon mot de passe').props.onClick();input('account-current','old-secret');input('account-new','new-secret');input('account-confirm','different-secret');await submit('account-new');assert.equal(updates.length,2);assert(draw().some(n=>n.props.role==='alert'));
input('account-confirm','new-secret');verificationFails=true;await submit('account-new');assert.equal(updates.length,2);
verificationFails=false;await submit('account-new');assert.deepEqual(updates[2],{password:'new-secret',current_password:'old-secret'});assert(!draw().some(n=>n.props.id==='account-new'));assert(!values.includes('old-secret'));assert(!values.includes('new-secret'));
fail=true;await submit('account-first');assert(draw().some(n=>n.props.role==='alert'));assert(!draw().some(n=>n.props.role==='status'));fail=false;
await button('Se déconnecter').props.onClick();assert.deepEqual(logout,{scope:'local'});assert.equal(redirect,'/login');console.log('Mon compte : identité de connexion distincte, confirmation e-mail, refus mots de passe divergents/actuel invalide, effacement secrets, erreurs et déconnexion locale : OK')
})().catch(e=>{console.error(e);process.exit(1)});
