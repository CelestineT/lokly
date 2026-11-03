const assert=require('node:assert/strict'),{loadSource}=require('./source-loader.cjs')
let calls=[],exists=false,fail=false
class IMAP{
 constructor(c){assert.equal(c.secure,true);assert.equal(c.logger,false);calls.push('new')}
 on(){}
 async connect(){if(fail)throw Error('secret password')}
 async list(){return[{path:'INBOX.Sent',specialUse:'\\Sent'}]}
 async getMailboxLock(){return{release(){calls.push('release')}}}
 async search(){return exists?[1]:[]}
 async append(folder,raw,flags){assert.equal(folder,'INBOX.Sent');assert.ok(Buffer.isBuffer(raw));assert.ok(raw.toString().includes('application/pdf'));assert.ok(!raw.toString().includes('\r\nBcc:'));calls.push('append');return{uid:1}}
 async logout(){calls.push('logout')}
 close(){calls.push('close')}
}
const env={HOSTINGER_IMAP_USER:'contact@ekolocs.fr',HOSTINGER_IMAP_PASSWORD:'hidden'}
const h=loadSource('src/lib/hostingerArchive.ts',{imapflow:{ImapFlow:IMAP}},{process:{env}})
;(async()=>{
 assert.equal(h.archiveApplies('CONTACT@ekolocs.fr',env),true)
 await assert.rejects(h.verifySentArchive('other@example.fr'));assert.equal(calls.length,0)
 await h.verifySentArchive('contact@ekolocs.fr');assert.ok(!calls.includes('append'))
 const payload={from:'contact@ekolocs.fr',to:['tenant@example.fr'],subject:'Quittance',html:'Bonjour',attachments:[{filename:'Quittance.pdf',content:Buffer.from('%PDF-example').toString('base64')}]}
 await h.archiveReceipt('contact@ekolocs.fr','123',payload);assert.equal(calls.filter(x=>x==='append').length,1)
 exists=true;await h.archiveReceipt('contact@ekolocs.fr','123',payload);assert.equal(calls.filter(x=>x==='append').length,1)
 fail=true;await assert.rejects(h.verifySentArchive('contact@ekolocs.fr'),e=>!e.message.includes('secret'))
 console.log('Hostinger : TLS, propriétaire, vérification sans envoi, MIME/PDF, dédoublonnage et erreurs sans secrets : OK')
})().catch(e=>{console.error(e);process.exitCode=1})
