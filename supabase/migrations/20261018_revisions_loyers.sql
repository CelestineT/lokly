-- Ekolocs : révisions mensuelles datées. Aucun loyer existant ni document émis n'est réécrit.
begin;
alter table public.baux add column if not exists historique_loyers jsonb not null default '[]'::jsonb;
create or replace function public.ajouter_revision_loyer(p_bail_id uuid,p_date_effet date,p_loyer_hc numeric,p_charges numeric,p_motif text default '')
returns jsonb language plpgsql security invoker set search_path=public as $$
declare b public.baux%rowtype; h jsonb; derniere date;
begin
 if auth.uid() is null then raise exception 'Connexion requise.'; end if;
 select * into b from public.baux where id=p_bail_id and proprietaire_id=auth.uid() for update;
 if not found then raise exception 'Bail introuvable ou accès non autorisé.'; end if;
 if p_date_effet is null or extract(day from p_date_effet)<>1 then raise exception 'Choisissez un mois de prise d’effet.'; end if;
 if p_loyer_hc is null or p_charges is null or p_loyer_hc<0 or p_charges<0 or p_loyer_hc::text in ('NaN','Infinity','-Infinity') or p_charges::text in ('NaN','Infinity','-Infinity') then raise exception 'Les montants doivent être positifs ou nuls.'; end if;
 if p_date_effet<=date_trunc('month',b.date_entree::date)::date then raise exception 'La révision doit commencer après le mois de début du bail.'; end if;
 if b.date_sortie is not null and p_date_effet>b.date_sortie then raise exception 'La révision ne peut pas commencer après la fin du bail.'; end if;
 h=coalesce(b.historique_loyers,'[]'::jsonb);
 select max((r->>'date_effet')::date) into derniere from jsonb_array_elements(h) r;
 if derniere is not null and p_date_effet<=derniere then raise exception 'Choisissez un mois postérieur à la dernière révision enregistrée.'; end if;
 -- Une révision rétroactive ne doit pas contredire une quittance déjà émise.
 if exists (select 1 from public.quittances q join public.locataires l on l.id=q.locataire_id where l.bail_id=b.id and q.proprietaire_id=auth.uid() and substring(q.mois::text,1,7)>=to_char(p_date_effet,'YYYY-MM') and (q.loyer_hc is distinct from p_loyer_hc or q.charges is distinct from p_charges)) then
 raise exception 'Une quittance existe déjà sur une période concernée avec un autre montant. Choisissez une date ultérieure.';
 end if;
 h=h||jsonb_build_array(jsonb_build_object('date_effet',p_date_effet,'loyer_hc',p_loyer_hc,'charges',p_charges,'motif',left(coalesce(p_motif,''),500),'enregistre_le',now()));
 update public.baux set historique_loyers=h where id=b.id and proprietaire_id=auth.uid();
 return h;
end $$;
revoke all on function public.ajouter_revision_loyer(uuid,date,numeric,numeric,text) from public;
grant execute on function public.ajouter_revision_loyer(uuid,date,numeric,numeric,text) to authenticated;
commit;
