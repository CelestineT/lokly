type Env=Record<string,string|undefined>
export function deliveryConfig(ownerEmail:string,tenantEmail:string,env:Env=process.env){
 const production=env.QUITTANCE_EMAIL_MODE==='production';
 const tests=(env.QUITTANCE_TEST_EMAILS||env.QUITTANCE_TEST_EMAIL||'synteyapartners@gmail.com').split(',').map(x=>x.trim()).filter(Boolean);
 const from=env.RESEND_FROM_EMAIL||'Ekolocs <onboarding@resend.dev>';
 if(production&&(!env.RESEND_API_KEY||!env.RESEND_FROM_EMAIL||/resend\.dev/i.test(from)))throw new Error('Envoi réel non configuré : renseignez RESEND_API_KEY et RESEND_FROM_EMAIL avec votre domaine vérifié.');
 if(production&&(!ownerEmail||!tenantEmail))throw new Error('Vérifiez les adresses e-mail du bailleur et du locataire.');
 return {production,from,to:production?[tenantEmail]:tests,bcc:production&&ownerEmail!==tenantEmail?[ownerEmail]:[],ownerEmail};
}
export function emailText(value:unknown){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))}
