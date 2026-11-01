import {PDFDocument,StandardFonts,rgb} from 'pdf-lib'
import {reportContext,reportValue,type ReportMetric} from './portfolioReport'
export async function portfolioReportPdf({from,to,scope,recipient,comment,metrics}:{from:string;to:string;scope:string;recipient:string;comment:string;metrics:ReportMetric[]}){
 const pdf=await PDFDocument.create(),regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);let page=pdf.addPage(),y=792
 const clean=(s:string)=>Array.from(s.replace(/[\u202f\u00a0]/g,' ')).map(c=>{try{regular.encodeText(c);return c}catch{return '?'}}).join('')
 function write(value:string,size=10,heading=false){const font=heading?bold:regular;for(const paragraph of value.split('\n')){let line='';const words=clean(paragraph).split(' ').flatMap(w=>w.length>65?w.match(/.{1,65}/g)??[]:[w]);for(const word of words){const next=line?line+' '+word:word;if(font.widthOfTextAtSize(next,size)>495&&line){draw(line);line=word}else line=next}draw(line)}y-=8;function draw(line:string){if(y<60){page=pdf.addPage();y=792}page.drawText(line,{x:50,y,size,font,color:rgb(.07,.1,.28)});y-=size+5}}
 write('Ekolocs - Rapport de gestion immobilière',18,true);write(scope,12,true);write(`Du ${from.split('-').reverse().join('/')} au ${to.split('-').reverse().join('/')}`);if(recipient)write(`À l’attention de : ${recipient}`)
 write('Synthèse automatique',13,true);reportContext(metrics,scope,from,to).forEach(p=>write(p))
 write('Indicateurs et méthode de lecture',13,true);metrics.forEach(m=>{write(`${m.label} : ${reportValue(m)}`,11,true);write(m.explanation)})
 write('Commentaires du propriétaire',13,true);write(comment||'Aucun commentaire ajouté.');write('Synthèse déclarative fondée sur les données actuellement enregistrées. Des corrections ultérieures peuvent modifier les résultats. Ni expertise immobilière ni comptes certifiés.',8)
 const pages=pdf.getPages();pages.forEach((p,i)=>p.drawText(`Ekolocs - ${i+1} / ${pages.length}`,{x:50,y:30,size:8,font:regular}));return pdf.save()
}
