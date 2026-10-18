// POSIX tar with PAX paths, readable by standard recovery tools. No browser plug-in required.
const encoder=new TextEncoder(),BLOCK=512
function octal(header:Uint8Array,offset:number,size:number,value:number){header.set(encoder.encode(value.toString(8).padStart(size-1,'0')+'\0'),offset)}
function header(name:string,size:number,type='0'){
 const h=new Uint8Array(BLOCK);h.set(encoder.encode(name).slice(0,100));octal(h,100,8,384);octal(h,108,8,0);octal(h,116,8,0);octal(h,124,12,size);octal(h,136,12,0);h.fill(32,148,156);h[156]=type.charCodeAt(0);h.set(encoder.encode('ustar\0'),257);h.set(encoder.encode('00'),263);const sum=h.reduce((a,b)=>a+b,0);h.set(encoder.encode(sum.toString(8).padStart(6,'0')+'\0 '),148);return h
}
function record(key:string,value:string){const body=` ${key}=${value}\n`;let length=encoder.encode(body).length+1;while(encoder.encode(String(length)+body).length!==length)length=encoder.encode(String(length)+body).length;return encoder.encode(String(length)+body)}
export function safeArchivePath(path:string){return !!path&&!path.startsWith('/')&&!path.includes('\\')&&!path.includes('\0')&&!path.split('/').some(s=>!s||s==='.'||s==='..')}
export function tarArchive(files:{path:string;bytes:Uint8Array}[]):Uint8Array{
 const parts:Uint8Array[]=[];const append=(h:Uint8Array,b:Uint8Array)=>parts.push(h,b,new Uint8Array((BLOCK-b.length%BLOCK)%BLOCK));const paths=new Set<string>();
 for(const[fileIndex,file]of files.entries()){if(!safeArchivePath(file.path)||paths.has(file.path))throw new Error('Chemin de sauvegarde invalide ou dupliqué.');paths.add(file.path);const pax=record('path',file.path);append(header(`PaxHeaders/${fileIndex}`,pax.length,'x'),pax);append(header(`entry-${fileIndex}`,file.bytes.length),file.bytes)}
 parts.push(new Uint8Array(BLOCK*2));const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length}return out
}
export const BACKUP_MAGIC=encoder.encode('EKOLOCS-BACKUP-1\n')
export const BACKUP_ITERATIONS=310000
export async function encryptArchive(bytes:Uint8Array,password:string){
 if(password.length<12)throw new Error('Utilisez une phrase secrète d’au moins 12 caractères.')
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),keyMaterial=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey'])
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:BACKUP_ITERATIONS,hash:'SHA-256'},keyMaterial,{name:'AES-GCM',length:256},false,['encrypt'])
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:BACKUP_MAGIC},key,new Uint8Array(bytes).buffer)
 return new Blob([BACKUP_MAGIC,salt,iv,encrypted],{type:'application/octet-stream'})
}
