import PortalButton from './PortalButton'
import Link from 'next/link'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {subscriptionPlans,subscriptionMoney,subscriptionTestReady} from '@/lib/subscriptionPlans'
import CheckoutButton from './CheckoutButton'
export const dynamic='force-dynamic'
export default async function SubscriptionPage(){
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)redirect('/login')
 const{data:right,error}=await s.from('account_access').select('kind,trial_ends_at').eq('user_id',user.id).maybeSingle()
 const{data:subscription}=await s.from('billing_test_subscriptions').select('plan,status').eq('user_id',user.id).maybeSingle()
 const lifetime=right?.kind==='lifetime',ready=subscriptionTestReady()&&!error&&!lifetime
 return <div className="mx-auto max-w-6xl p-4 sm:p-8"><Link href="/dashboard/compte" className="text-sm text-blue-700">← Mon compte</Link><h1 className="mt-4 text-3xl font-bold">Mon abonnement</h1><p className="mt-2 text-slate-600">Ekolocs, commercialisé par Synteya Partners.</p>
 <section className="my-6 rounded-2xl border bg-white p-5" aria-label="Votre accès"><h2 className="text-lg font-semibold">{lifetime?'Accès offert à vie':right?.kind==='legacy'?'Votre accès actuel est conservé':right?.kind==='trial'?'Essai gratuit de 30 jours':'Préparation de votre abonnement'}</h2><p className="mt-2 text-slate-600">{lifetime?'Aucun abonnement à payer, aucune carte bancaire ni renouvellement. Les crédits SMS restent séparés.':right?.kind==='trial'&&right.trial_ends_at?`Fin de l’essai : ${new Date(right.trial_ends_at).toLocaleDateString('fr-FR')}. Aucune carte bancaire demandée pour cet essai.`:'La préparation des abonnements ne bloque pas votre utilisation actuelle.'}</p>{subscription&&<p className="mt-2">Abonnement de test : {subscription.plan} · {subscription.status}. Aucun droit payant réel activé.</p>}{subscription&&!lifetime&&<PortalButton/>}</section>
 <div role="status" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">Version de préparation — aucun paiement réel. {ready?'Le paiement fictif Stripe est disponible.':'Le raccordement au compte Stripe de Synteya Partners reste à finaliser.'}</div>
 <div className="grid gap-5 md:grid-cols-3">{subscriptionPlans.map(p=><section key={p.id} className="flex flex-col rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">{p.name}</h2><p className="mt-2 text-slate-600">Jusqu’à {p.limit} logements</p><p className="mt-5 text-3xl font-bold">{subscriptionMoney(p.monthly)}<span className="text-sm font-normal"> / mois</span></p><p className="mt-2 mb-5">ou {subscriptionMoney(p.yearly)} / an, payé en une fois</p><p className="mb-6 text-sm text-slate-600">Gestion des biens, locataires, paiements, quittances, dépenses et rapports. Crédits SMS séparés.</p><div className="mt-auto space-y-3"><CheckoutButton plan={p.id} interval="month" disabled={!ready}/><CheckoutButton plan={p.id} interval="year" disabled={!ready}/></div></section>)}</div>
 <section className="mt-5 rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Sur mesure</h2><p className="mt-2">Plus de 25 logements : offre sur devis auprès de Synteya Partners.</p></section><p className="mt-5 text-sm text-slate-600">Prix finaux proposés en euros. Les mentions fiscales et les conditions commerciales seront finalisées avant l’ouverture des paiements réels. Les limites et le passage en lecture seule en fin d’essai ne sont pas activés dans cette version de préparation.</p></div>
}
