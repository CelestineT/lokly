'use client'
import FormattedText from '@/components/FormattedText'
import {useId} from 'react'
import type {tenantPaymentReview} from '@/lib/tenantPaymentReview'
type Review=ReturnType<typeof tenantPaymentReview>
export default function TenantPaymentReview({review,notes,error}:{review:Review;notes:{name:string;text:string}[];error?:boolean}){
 const id=useId()
 return <details className="tenant-payment-review"><summary aria-controls={id}>Suivi des paiements</summary><div id={id} className="tenant-payment-popover"><h4>Suivi des paiements</h4>{error?<p role="alert">Historique indisponible. Actualisez la page.</p>:<><strong>{review.label}</strong><p>12 derniers mois · au niveau du bail</p><p>{review.score===null?'Ponctualité non calculable':`${review.score} % d’échéances soldées dans les délais`}</p><div className="tenant-payment-counts"><span>{review.onTime} à l’heure</span><span>{review.late} en retard</span><span>{review.unpaid} non soldée(s)</span><span>{review.upcoming} à venir</span>{review.unknown>0&&<span>{review.unknown} à vérifier</span>}</div><details><summary>Voir les échéances et dates limites</summary><ul>{review.rows.map(r=><li key={r.month}>{r.month} · {r.status} · limite : {r.deadline??'non renseignée'}</li>)}</ul></details><p>Le paiement intégral, solde antérieur compris, doit être reçu avant la limite enregistrée dans le bail. Les périodes à vérifier ou à venir sont exclues du pourcentage.</p></>}<h5>Commentaire interne</h5>{notes.length?notes.map((note,i)=><div key={i}><b>{note.name}</b><p className="tenant-private-comment"><FormattedText value={note.text}/></p></div>):<p>Aucun commentaire interne enregistré.</p>}<small>Visible uniquement par le bailleur. Absent des quittances et des e-mails.</small></div></details>
}
