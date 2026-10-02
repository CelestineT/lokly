import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib'

const MOIS_FR=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
const mois=(value:string)=>{const[y,m]=value.split('-');const label=MOIS_FR[Number(m)-1];return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${y}`}
const eur=(value:number)=>`${Number(value??0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}).replace(/\u202f/g,' ')} EUR`
const LOT_LABELS:Record<string,string>={box:'Box',parking:'Parking',garage:'Garage',cave:'Cave'}
function wrap(text:string,font:PDFFont,size:number,maxWidth:number){const out:string[]=[];let line='';for(const word of text.split(' ')){const test=line?`${line} ${word}`:word;if(line&&font.widthOfTextAtSize(test,size)>maxWidth){out.push(line);line=word}else line=test}if(line)out.push(line);return out}

export type QuittancePdfLotAnnexe={numero_lot?:string;type?:string;prix_mensuel:number}
export type QuittancePdfV3Params={
  locataireNom:string; proprietaireNom:string; bienNom:string; bienAdresse:string; bienVille:string;
  lotLibelle?:string; mois:string; loyerHc:number; charges:number; lotsAnnexes?:QuittancePdfLotAnnexe[]; solde:number; total:number;
  signatureDataUrl?:string; dateSignature:string
}

export async function generateQuittancePdfV3(p:QuittancePdfV3Params):Promise<Uint8Array>{
 const pdf=await PDFDocument.create();const page=pdf.addPage([595,842]);const{width,height}=page.getSize();
 const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const navy=rgb(.06,.12,.22),blue=rgb(.05,.35,.72),muted=rgb(.38,.43,.5),border=rgb(.87,.89,.92),soft=rgb(.96,.97,.99);
 const x=48,right=width-48;
 page.drawText('QUITTANCE DE LOYER',{x,y:height-62,size:21,font:bold,color:navy});
 page.drawText(mois(p.mois),{x,y:height-86,size:11,font:regular,color:muted});
 page.drawText('Document acquitté',{x:right-100,y:height-64,size:9,font:bold,color:blue});
 page.drawLine({start:{x,y:height-105},end:{x:right,y:height-105},thickness:1.2,color:blue});
 const top=height-145;
 page.drawText('BAILLEUR',{x,y:top,size:8,font:bold,color:blue});page.drawText(p.proprietaireNom,{x,y:top-20,size:12,font:bold,color:navy});
 page.drawText('LOCATAIRE',{x:320,y:top,size:8,font:bold,color:blue});page.drawText(p.locataireNom,{x:320,y:top-20,size:12,font:bold,color:navy});
 let y=top-70;
 page.drawRectangle({x,y:y-76,width:right-x,height:86,color:soft,borderColor:border,borderWidth:1});
 page.drawText('LOGEMENT LOUÉ',{x:x+14,y:y-10,size:8,font:bold,color:blue});page.drawText(p.bienNom||'Bien loué',{x:x+14,y:y-31,size:11,font:bold,color:navy});
 page.drawText([p.bienAdresse,p.bienVille].filter(Boolean).join(', '),{x:x+14,y:y-49,size:9.5,font:regular,color:muted});
 if(p.lotLibelle)page.drawText(p.lotLibelle,{x:x+14,y:y-67,size:9.5,font:bold,color:navy});
 y-=118;page.drawText('DÉTAIL DU RÈGLEMENT',{x,y,size:8,font:bold,color:blue});y-=22;
 const rows:Array<[string,string]>=[['Loyer hors charges',eur(p.loyerHc)],['Charges',eur(p.charges)]];
 for(const lot of p.lotsAnnexes??[]){const type=String(lot.type??'lot');const label=LOT_LABELS[type]??type.replace(/_/g,' ');rows.push([`${label}${lot.numero_lot?` · ${lot.numero_lot}`:''}`,eur(lot.prix_mensuel)])}
 if(Number(p.solde)!==0)rows.push(['Solde / régularisation',eur(p.solde)]);
 const rowHeight=24,totalHeight=30,boxHeight=Math.max(112,rows.length*rowHeight+totalHeight+10);
 page.drawRectangle({x,y:y-boxHeight+10,width:right-x,height:boxHeight,borderColor:border,borderWidth:1});page.drawRectangle({x,y:y-boxHeight+10,width:right-x,height:totalHeight,color:soft});
 let ry=y-13;for(const[label,amount]of rows){page.drawText(label,{x:x+14,y:ry,size:10,font:regular,color:muted});page.drawText(amount,{x:right-14-regular.widthOfTextAtSize(amount,10),y:ry,size:10,font:regular,color:navy});ry-=rowHeight}
 const ty=y-boxHeight+20,total=eur(p.total);page.drawText('TOTAL ACQUITTÉ',{x:x+14,y:ty,size:11,font:bold,color:navy});page.drawText(total,{x:right-14-bold.widthOfTextAtSize(total,11),y:ty,size:11,font:bold,color:blue});
 y-=boxHeight+33;page.drawText('ATTESTATION',{x,y,size:8,font:bold,color:blue});y-=22;
 const legal=`Je soussigné(e), ${p.proprietaireNom}, bailleur du logement désigné ci-dessus, reconnais avoir reçu de ${p.locataireNom} la somme de ${eur(p.total)} au titre du loyer et des charges pour ${mois(p.mois)} et lui en donne quittance, sous réserve de tous mes droits.`;
 for(const line of wrap(legal,regular,10,right-x)){page.drawText(line,{x,y,size:10,font:regular,color:muted});y-=16}
 y-=20;page.drawText(`Fait le ${p.dateSignature}`,{x,y,size:9.5,font:regular,color:muted});y-=25;page.drawText('Signature du bailleur',{x,y,size:9,font:bold,color:navy});y-=8;
 if(p.signatureDataUrl?.includes('base64,')){try{const bytes=Buffer.from(p.signatureDataUrl.split('base64,')[1],'base64');let image;try{image=await pdf.embedPng(bytes)}catch{image=await pdf.embedJpg(bytes)}const dims=image.scaleToFit(190,70);page.drawImage(image,{x,y:y-dims.height,width:dims.width,height:dims.height})}catch{page.drawRectangle({x,y:y-65,width:190,height:65,borderColor:border,borderWidth:1})}}else page.drawRectangle({x,y:y-65,width:190,height:65,borderColor:border,borderWidth:1});
 page.drawText('Cette quittance annule tous les reçus qui auraient pu être établis pour la même période.',{x,y:35,size:7.5,font:regular,color:muted});
 return pdf.save()
}
