-- Ekolocs : corriger une saisie sans effacer les révisions ni réécrire les quittances.
-- À exécuter après 20261018_revisions_loyers.sql dans le projet Supabase de recette.
begin;
alter table public.baux add column if not exists corrections_loyers jsonb not null default '[]'::jsonb;
create or replace function public.corriger_montant_loyer(
 p_bail_id uuid,p_date_effet date,p_loyer_hc numeric,p_charges numeric,p_motif text,p_attendu jsonb
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare b public.baux%rowtype; h jsonb; ancien_hc numeric; anciennes_charges numeric;
 debut date; fin date; cible jsonb; journal jsonb;
begin
 if auth.uid() is null then raise exception 'Connexion requise.'; end if;
 select * into b from public.baux where id=p_bail_id and proprietaire_id=auth.uid() for update;
 if not found then raise exception 'Bail introuvable ou accès non autorisé.'; end if;
 if p_loyer_hc is null or p_charges is null or p_loyer_hc<0 or p_charges<0
  or p_loyer_hc::text in ('NaN','Infinity','-Infinity') or p_charges::text in ('NaN','Infinity','-Infinity')
  or round(p_loyer_hc,2)<>p_loyer_hc or round(p_charges,2)<>p_charges then
  raise exception 'Saisissez des montants positifs ou nuls, avec deux décimales maximum.';
 end if;
 if length(trim(coalesce(p_motif,'')))=0 or length(p_motif)>500 then raise exception 'Renseignez un motif de correction (500 caractères maximum).'; end if;
 h=coalesce(b.historique_loyers,'[]'::jsonb);
 if p_attendu is distinct from jsonb_build_object('loyer_hc',b.loyer_hc,'charges',b.charges,'historique_loyers',h) then
  raise exception 'Le loyer a été modifié depuis l’ouverture de la fiche. Actualisez avant de réessayer.';
 end if;
 if p_date_effet is null then
  ancien_hc=b.loyer_hc;anciennes_charges=b.charges;debut=date_trunc('month',b.date_entree::date)::date;
  select min((r->>'date_effet')::date) into fin from jsonb_array_elements(h) r;
 else
  if extract(day from p_date_effet)<>1 then raise exception 'La date de la révision est invalide.'; end if;
  if (select count(*) from jsonb_array_elements(h) r where (r->>'date_effet')::date=p_date_effet)<>1 then raise exception 'Révision introuvable ou dupliquée. Actualisez la fiche.'; end if;
  select r into cible from jsonb_array_elements(h) r where (r->>'date_effet')::date=p_date_effet;
  ancien_hc=(cible->>'loyer_hc')::numeric;anciennes_charges=(cible->>'charges')::numeric;debut=p_date_effet;
  select min((r->>'date_effet')::date) into fin from jsonb_array_elements(h) r where (r->>'date_effet')::date>p_date_effet;
 end if;
 if ancien_hc=p_loyer_hc and anciennes_charges=p_charges then raise exception 'Aucun montant n’a été modifié.'; end if;
 -- Contrôle uniquement la période couverte par le montant corrigé, jusqu’à la révision suivante.
 if exists(select 1 from public.quittances q join public.locataires l on l.id=q.locataire_id
  where l.bail_id=b.id and q.proprietaire_id=auth.uid()
   and substring(q.mois::text,1,7)>=to_char(debut,'YYYY-MM')
   and (fin is null or substring(q.mois::text,1,7)<to_char(fin,'YYYY-MM'))
   and (q.loyer_hc is distinct from p_loyer_hc or q.charges is distinct from p_charges)) then
  raise exception 'Une quittance a déjà été créée sur cette période avec un autre montant. Elle est conservée : ajoutez une nouvelle révision pour une période ultérieure.';
 end if;
 journal=coalesce(b.corrections_loyers,'[]'::jsonb)||jsonb_build_array(jsonb_build_object(
  'date_correction',now(),'date_effet',p_date_effet,'ancien_loyer_hc',ancien_hc,'anciennes_charges',anciennes_charges,
  'loyer_hc',p_loyer_hc,'charges',p_charges,'motif',trim(p_motif),'auteur_id',auth.uid()));
 if p_date_effet is null then
  update public.baux set loyer_hc=p_loyer_hc,charges=p_charges,corrections_loyers=journal where id=b.id and proprietaire_id=auth.uid();
 else
  select jsonb_agg(case when (r->>'date_effet')::date=p_date_effet then r||jsonb_build_object('loyer_hc',p_loyer_hc,'charges',p_charges) else r end order by ord)
   into h from jsonb_array_elements(h) with ordinality as entries(r,ord);
  update public.baux set historique_loyers=h,corrections_loyers=journal where id=b.id and proprietaire_id=auth.uid();
 end if;
 return jsonb_build_object('loyer_hc',case when p_date_effet is null then p_loyer_hc else b.loyer_hc end,
  'charges',case when p_date_effet is null then p_charges else b.charges end,'historique_loyers',h,'corrections_loyers',journal);
end $$;
revoke all on function public.corriger_montant_loyer(uuid,date,numeric,numeric,text,jsonb) from public;
grant execute on function public.corriger_montant_loyer(uuid,date,numeric,numeric,text,jsonb) to authenticated;
commit;
