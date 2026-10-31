export type TextRun={text:string;bold:boolean;italic:boolean}
/** Plain text plus paired emphasis markers. Never interprets HTML, links or scripts. */
export function richTextRuns(value:string):TextRun[]{
 const out:TextRun[]=[]
 function parse(text:string,bold=false,italic=false){
  const re=/(\*\*\*|\*\*|\*)/g;let cursor=0,m:RegExpExecArray|null
  while((m=re.exec(text))){const marker=m[0],end=text.indexOf(marker,m.index+marker.length);if(end<0)continue
   if(m.index>cursor)out.push({text:text.slice(cursor,m.index),bold,italic})
   parse(text.slice(m.index+marker.length,end),bold||marker.length>1,italic||marker.length!==2);cursor=end+marker.length;re.lastIndex=cursor
  }
  if(cursor<text.length)out.push({text:text.slice(cursor),bold,italic})
 }
 parse(String(value??''));return out
}
export function plainRichText(value:string){return richTextRuns(value).map(r=>r.text).join('')}
