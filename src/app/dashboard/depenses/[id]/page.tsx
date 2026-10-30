import '../expense-detail.css'
import {expenseCategoryLabel} from '@/lib/expenseCategories'
import {ArrowLeft,ReceiptText,Euro,CalendarDays,Tag,House,Pencil,FileText} from 'lucide-react'
import ExpenseAttachments from '../ExpenseAttachments'
import Link from 'next/link'
import {notFound,redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import DeleteDepenseButton from '../DeleteDepenseButton'
const labels:Record<string,string>={travaux:'Travaux',charges:'Charges',assurance:'Assurance',gestion:'Gestion',taxe:'Taxe',autre:'Autre',mensuelle:'Mensuelle',trimestrielle:'Trimestrielle',semestrielle:'Semestrielle',annuelle:'Annuelle'}
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params,s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)redirect('/login')
 const{data:d,error}=await s.from('depenses').select('*').eq('id',id).eq('proprietaire_id',user.id).maybeSingle();if(error)throw new Error('Impossible de charger la dépense.');if(!d)notFound()
 const{data:b}=d.bien_id?await s.from('biens').select('nom,ville,code_postal').eq('id',d.bien_id).eq('proprietaire_id',user.id).maybeSingle():{data:null}
 const money=Number(d.montant).toLocaleString('fr-FR',{style:'currency',currency:'EUR'}),date=d.date_depense?new Date(`${d.date_depense}T12:00:00`).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'}):'Non renseignée'
 return <div className="expense-detail"><Link href="/dashboard/depenses" className="expense-back"><ArrowLeft size={16}/> Retour aux dépenses</Link><header className="expense-detail-header"><div className="expense-heading"><span><ReceiptText size={26}/></span><div><h1>Détail de la dépense</h1><p>{d.description||expenseCategoryLabel(d.categorie)||'Dépense enregistrée'}</p></div></div><Link href={`/dashboard/depenses/${id}/modifier`} className="expense-primary"><Pencil size={16}/> Modifier la dépense</Link></header><div className="expense-summary"><Summary icon={<Euro size={22}/>} label="Montant" value={money}/><Summary icon={<CalendarDays size={22}/>} label="Date de la dépense" value={date}/><Summary icon={<Tag size={22}/>} label="Catégorie" value={expenseCategoryLabel(d.categorie)}/></div><div className="expense-detail-grid"><div className="expense-sections"><section className="expense-panel"><h2><House size={19}/> Rattachement et informations</h2><dl className="expense-info-grid"><Info label="Bien" value={b?`${b.nom} — ${[b.code_postal,b.ville].filter(Boolean).join(' ')}`:'Non rattachée à un bien'}/>{d.categorie==='travaux'&&<Info label="Type de travaux" value={d.type_travaux||'Non renseigné'}/>}<Info label="Récurrence" value={d.recurrente?(labels[d.periodicite]??d.periodicite??'Oui'):'Non'}/><Info label="Déclarée déductible fiscalement" value={d.deductible_fiscalement?'Oui':'Non'}/></dl></section><section className="expense-panel"><h2><FileText size={19}/> Description</h2><p className="expense-description">{d.description||'Aucune description'}</p></section></div><aside className="expense-documents"><ExpenseAttachments id={id}/></aside></div><footer className="expense-detail-footer"><Link href="/dashboard/depenses" className="expense-secondary">Retour à la liste</Link><DeleteDepenseButton id={id} returnToList/></footer></div>
}
function Info({label,value}:{label:string;value:string}){return <div><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>}

function Summary({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div><span>{icon}</span><div><p>{label}</p><strong>{value}</strong></div></div>}
