import Link from 'next/link'
import {ArrowLeft,Building2,Users,FileText,Landmark,House,CalendarDays,Wallet,Paperclip,Settings2} from 'lucide-react'
const icons={building:Building2,users:Users,file:FileText,bank:Landmark,home:House,calendar:CalendarDays,wallet:Wallet,attachment:Paperclip,settings:Settings2}
type Icon=keyof typeof icons
export function FormHeader({title,description,backHref,backLabel,icon='file'}:{title:string;description:string;backHref:string;backLabel:string;icon?:Icon}){const Symbol=icons[icon];return <><Link prefetch={false} href={backHref} className="form-page-back"><ArrowLeft size={16}/>{backLabel}</Link><header className="form-page-heading"><span className="form-page-symbol"><Symbol size={27}/></span><div><h1>{title}</h1><p>{description}</p></div></header></>}
export function FormSection({title,icon='file',children}:{title:string;icon?:Icon;children:React.ReactNode}){const Symbol=icons[icon];return <section className="form-page-section"><h2><Symbol size={20}/>{title}</h2><div className="form-page-section-body">{children}</div></section>}
