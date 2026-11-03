import {ImapFlow} from 'imapflow'
import nodemailer from 'nodemailer'
export function archiveApplies(email:string,env=process.env){return !!env.HOSTINGER_IMAP_USER&&email.trim().toLowerCase()===env.HOSTINGER_IMAP_USER.trim().toLowerCase()}
export async function openSentArchive(email:string){
 if(!archiveApplies(email)||!process.env.HOSTINGER_IMAP_PASSWORD)throw Error('Archivage Hostinger non configuré pour ce bailleur.')
 const client=new ImapFlow({host:'imap.hostinger.com',port:993,secure:true,auth:{user:process.env.HOSTINGER_IMAP_USER!,pass:process.env.HOSTINGER_IMAP_PASSWORD!},logger:false,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,disableAutoIdle:true})
 client.on('error',()=>{})
 try{await client.connect();const boxes=await client.list();const sent=boxes.find(b=>b.specialUse==='\\Sent')??boxes.find(b=>['Sent','INBOX.Sent','Sent Items','Sent Messages'].includes(b.path));if(!sent)throw Error('sent missing');return{client,folder:sent.path}}catch{client.close();throw Error('Connexion Hostinger ou dossier Éléments envoyés indisponible. Vérifiez les identifiants IMAP.')}
}
export async function verifySentArchive(email:string){const a=await openSentArchive(email);try{const lock=await a.client.getMailboxLock(a.folder,{readOnly:true});lock.release();return a.folder}finally{await a.client.logout().catch(()=>a.client.close())}}
export async function archiveReceipt(email:string,id:string,payload:any,date?:string){
 const a=await openSentArchive(email),messageId=`<ekolocs-${id}@ekolocs.fr>`
 try{const lock=await a.client.getMailboxLock(a.folder);try{
  const exists=await a.client.search({header:{'message-id':messageId}},{uid:true});if(exists&&exists.length)return
  const built=await nodemailer.createTransport({streamTransport:true,buffer:true,newline:'windows'}).sendMail({from:payload.from,to:payload.to,subject:payload.subject,html:payload.html,replyTo:payload.reply_to,messageId,date:date?new Date(date):undefined,disableFileAccess:true,disableUrlAccess:true,attachments:payload.attachments.map((x:any)=>({filename:x.filename,content:Buffer.from(x.content,'base64'),contentType:'application/pdf'}))})
  const saved=await a.client.append(a.folder,built.message as Buffer,['\\Seen'],date?new Date(date):new Date());if(!saved)throw Error('Append refused')
 }finally{lock.release()}}finally{await a.client.logout().catch(()=>a.client.close())}
}
