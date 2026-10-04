import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib'

const MOIS_FR=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
const mois=(value:string)=>{const[y,m]=value.split('-');const label=MOIS_FR[Number(m)-1]??'';return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${y}`}
const eur=(value:number)=>`${Number(value??0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}).replace(/\u202f/g,' ')} EUR`
function wrap(text:string,font:PDFFont,size:number,maxWidth:number){const out:string[]=[];let line='';for(const word of String(text??'').split(' ')){const test=line?`${line} ${word}`:word;if(line&&font.widthOfTextAtSize(test,size)>maxWidth){out.push(line);line=word}else line=test}if(line)out.push(line);return out}
function fit(text:string,font:PDFFont,size:number,maxWidth:number){let s=size;while(s>7&&font.widthOfTextAtSize(text,s)>maxWidth)s-=.5;return s}

export type QuittancePdfV3Params={
  locataireNom:string; proprietaireNom:string; bienNom:string; bienAdresse:string; bienVille:string;
  lotLibelle?:string; mois:string; loyerHc:number; charges:number; solde:number; total:number;
  signatureDataUrl?:string; dateSignature:string
}

export async function generateQuittancePdfV3(p:QuittancePdfV3Params):Promise<Uint8Array>{
 const pdf=await PDFDocument.create();const page=pdf.addPage([595,842]);const{width,height}=page.getSize();
 const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const navy=rgb(.035,.075,.16),blue=rgb(.10,.19,.88),muted=rgb(.36,.43,.54),line=rgb(.83,.86,.91),soft=rgb(.965,.973,.99),white=rgb(1,1,1);
 const left=42,right=width-42,contentW=right-left;
 const txt=(text:string,x:number,y:number,size=9,font:PDFFont=regular,color=navy)=>page.drawText(text,{x,y,size,font,color});
 const rule=(y:number,x1=left,x2=right,thickness=.8,color=line)=>page.drawLine({start:{x:x1,y},end:{x:x2,y},thickness,color});

 // Identite Ekolocs — wordmark provisoire en attendant le logo definitif.
 txt('EKOLOCS',left,height-48,18,bold,navy);txt('Gestion locative',left,height-62,7.5,regular,muted);
 const period=mois(p.mois);const title='QUITTANCE DE LOYER';
 txt(title,(width-bold.widthOfTextAtSize(title,17))/2,height-50,17,bold,navy);
 txt(period,right-regular.widthOfTextAtSize(period,9),height-47,9,regular,muted);
 const ref=`${p.mois.replace('-','')}`;txt(`Reference : ${ref}`,right-regular.widthOfTextAtSize(`Reference : ${ref}`,7.5),height-62,7.5,regular,muted);
 rule(height-78,left,right,1.3,blue);

 // Bailleur / locataire
 let y=height-105;const col2=320;
 txt('INFORMATIONS DU BAILLEUR',left,y,7.5,bold,blue);txt('INFORMATIONS DU LOCATAIRE',col2,y,7.5,bold,blue);
 y-=20;txt(p.proprietaireNom||'-',left,y,11,bold,navy);txt(p.locataireNom||'-',col2,y,11,bold,navy);
 y-=34;rule(y);

 // Bien loue
 y-=24;txt('BIEN LOUE',left,y,7.5,bold,blue);y-=19;
 const bien=p.bienNom||'Bien loue';txt(bien,left,y,11,bold,navy);
 const address=[p.bienAdresse,p.bienVille].filter(Boolean).join(', ');if(address)txt(address,left,y-17,9.2,regular,muted);
 if(p.lotLibelle){const lot=`Lot : ${p.lotLibelle}`;txt(lot,320,y,fit(lot,bold,9.5,right-320),bold,navy)}
 y-=48;rule(y);

 // Tableau financier inspire d'un avis d'echeance, adapte a une quittance Ekolocs.
 y-=25;txt('DETAIL DE LA QUITTANCE',left,y,7.5,bold,blue);y-=15;
 const tableTop=y,tableBottom=y-154;const descX=left,amountX=405;
 page.drawRectangle({x:left,y:tableBottom,width:contentW,height:154,borderColor:line,borderWidth:.8});
 page.drawRectangle({x:left,y:tableTop-25,width:contentW,height:25,color:soft});
 page.drawLine({start:{x:amountX,y:tableBottom},end:{x:amountX,y:tableTop},thickness:.8,color:line});
 txt('LIBELLE',descX+10,tableTop-16,8,bold,muted);txt('MONTANT',amountX+10,tableTop-16,8,bold,muted);
 const rows:Array<[string,number]>=[['Loyer hors charges',Number(p.loyerHc??0)],['Charges / acompte sur charges',Number(p.charges??0)]];
 if(Number(p.solde)!==0)rows.push(['Solde anterieur / regularisation',Number(p.solde)]);
 let rowY=tableTop-48;
 for(const[label,value]of rows){txt(label,descX+10,rowY,9.5,regular,navy);const a=eur(value);txt(a,right-10-regular.widthOfTextAtSize(a,9.5),rowY,9.5,regular,navy);rowY-=25}
 rule(tableBottom+35,left,right,.8,line);const total=eur(p.total);txt('TOTAL QUITTANCE',descX+10,tableBottom+14,10.5,bold,navy);txt(total,right-10-bold.widthOfTextAtSize(total,11),tableBottom+14,11,bold,blue);
 y=tableBottom-27;

 // Information / attestation
 txt('INFORMATIONS',left,y,7.5,bold,blue);y-=18;
 const legal=`Je soussigne(e), ${p.proprietaireNom}, bailleur du logement designe ci-dessus, reconnais avoir recu de ${p.locataireNom} la somme de ${eur(p.total)} au titre du loyer et des charges pour ${mois(p.mois)} et lui en donne quittance, sous reserve de tous mes droits.`;
 for(const l of wrap(legal,regular,8.8,contentW)){txt(l,left,y,8.8,regular,muted);y-=13}

 // Bas de page : coordonnees bancaires reservees + signature.
 y-=16;const boxTop=y;const half=(contentW-18)/2;
 page.drawRectangle({x:left,y:boxTop-90,width:half,height:90,color:soft,borderColor:line,borderWidth:.8});
 page.drawRectangle({x:left+half+18,y:boxTop-90,width:half,height:90,color:white,borderColor:line,borderWidth:.8});
 txt('COORDONNEES BANCAIRES',left+12,boxTop-18,7.5,bold,blue);
 txt('IBAN',left+12,boxTop-40,8,bold,muted);txt('A renseigner dans les parametres',left+55,boxTop-40,8,regular,muted);
 txt('BIC',left+12,boxTop-58,8,bold,muted);txt('A renseigner dans les parametres',left+55,boxTop-58,8,regular,muted);
 const sx=left+half+30;txt('SIGNATURE DU BAILLEUR',sx,boxTop-18,7.5,bold,blue);txt(`Fait le ${p.dateSignature}`,sx,boxTop-36,8,regular,muted);
 if(p.signatureDataUrl?.includes('base64,')){try{const bytes=Buffer.from(p.signatureDataUrl.split('base64,')[1],'base64');let image;try{image=await pdf.embedPng(bytes)}catch{image=await pdf.embedJpg(bytes)}const dims=image.scaleToFit(150,45);page.drawImage(image,{x:sx,y:boxTop-84,width:dims.width,height:dims.height})}catch{/* conserve la zone vide */}}

 txt('Ekolocs — Quittance de loyer generee depuis votre espace bailleur',left,28,7,regular,muted);
 return pdf.save()
}
