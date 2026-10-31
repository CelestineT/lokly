import {richTextRuns} from '@/lib/richText'
export default function FormattedText({value}:{value:string}){return <span style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{richTextRuns(value).map((r,i)=><span key={i} style={{fontWeight:r.bold?700:undefined,fontStyle:r.italic?'italic':undefined}}>{r.text}</span>)}</span>}
