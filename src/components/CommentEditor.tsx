'use client'
import {useId,useRef,useState} from 'react'
import type {TextareaHTMLAttributes,ChangeEvent} from 'react'
import FormattedText from './FormattedText'
export default function CommentEditor({value,defaultValue,onChange,...props}:TextareaHTMLAttributes<HTMLTextAreaElement>){
 const [draft,setDraft]=useState(String(defaultValue??'')),ref=useRef<HTMLTextAreaElement>(null),id=useId(),current=String(value??draft)
 function format(kind:'bold'|'italic'|'upper'|'bullet'){
  const el=ref.current;if(!el||el.disabled||el.readOnly)return
  const start=el.selectionStart,end=el.selectionEnd,selected=current.slice(start,end)
  if(kind==='upper'&&!selected)return
  const marker=kind==='bold'?'**':'*',replacement=kind==='upper'?selected.toLocaleUpperCase('fr-FR'):kind==='bullet'?'- '+(selected||'Texte').replace(/\n/g,'\n- '):marker+(selected||'Texte')+marker,next=current.slice(0,start)+replacement+current.slice(end)
  if(props.maxLength&&next.length>props.maxLength)return
  setDraft(next);el.value=next;onChange?.({target:el,currentTarget:el} as ChangeEvent<HTMLTextAreaElement>);el.focus()
  requestAnimationFrame(()=>el.setSelectionRange(start,start+replacement.length))
 }
 return <div className="comment-editor"><div role="toolbar" aria-label="Mise en forme du commentaire" style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:6}}>{([['bold','Gras'],['italic','Italique'],['upper','MAJUSCULES'],['bullet','Liste']] as const).map(([kind,label])=><button key={kind} type="button" title={kind==='upper'?'Sélectionnez le texte à mettre en majuscules':label} disabled={props.disabled||props.readOnly} onMouseDown={e=>e.preventDefault()} onClick={()=>format(kind)} style={{border:'1px solid #dce3ee',borderRadius:6,padding:'5px 9px',background:'white',fontSize:12,fontWeight:kind==='bold'?700:400,fontStyle:kind==='italic'?'italic':'normal'}}>{label}</button>)}</div><textarea {...props} ref={ref} value={current} onChange={e=>{setDraft(e.target.value);onChange?.(e)}} aria-describedby={[props['aria-describedby'],`${id}-help`].filter(Boolean).join(' ')}/><p id={`${id}-help`} style={{fontSize:11,color:'#64748b',margin:'4px 0'}}>Sélectionnez un texte puis utilisez les boutons. **gras** · *italique*</p>{current&&<details style={{fontSize:13,marginTop:6}}><summary>Aperçu de la mise en forme</summary><div style={{padding:10,background:'#f8fafc',borderRadius:8}}><FormattedText value={current}/></div></details>}</div>
}
