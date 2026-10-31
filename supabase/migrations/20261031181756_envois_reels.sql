begin;
create schema if not exists ekolocs_private;
revoke all on schema ekolocs_private from public, anon;
grant usage on schema ekolocs_private to authenticated;
create table if not exists public.sms_comptes (
 proprietaire_id uuid primary key references auth.users(id) on delete cascade,
 actif boolean not null default false,
 solde_segments integer not null default 0 check(solde_segments>=0)
);
create table if not exists public.sms_campagnes (
 id uuid primary key, proprietaire_id uuid not null references auth.users(id) on delete cascade,
 empreinte text not null, cree_le timestamptz not null default now()
);
create table if not exists public.sms_envois (
 id uuid primary key default gen_random_uuid(), campagne_id uuid not null references public.sms_campagnes(id),
 proprietaire_id uuid not null references auth.users(id) on delete cascade,
 locataire_id uuid not null, telephone text not null, texte text not null,
 segments integer not null check(segments between 1 and 10),
 statut text not null default 'reserved',twilio_sid text,code_erreur text,
 cree_le timestamptz not null default now(), unique(campagne_id,telephone)
);
create index if not exists sms_envois_owner_date on public.sms_envois(proprietaire_id,cree_le desc);
create index if not exists sms_campaign_owner on public.sms_campagnes(proprietaire_id,cree_le desc);
create index if not exists sms_envois_campaign on public.sms_envois(campagne_id);
alter table public.sms_comptes enable row level security;
alter table public.sms_campagnes enable row level security;
alter table public.sms_envois enable row level security;
revoke all on public.sms_comptes, public.sms_campagnes, public.sms_envois from anon, authenticated;
grant select on public.sms_comptes, public.sms_campagnes, public.sms_envois to authenticated;
create policy sms_comptes_own on public.sms_comptes for select to authenticated using(proprietaire_id=(select auth.uid()));
create policy sms_campagnes_own on public.sms_campagnes for select to authenticated using(proprietaire_id=(select auth.uid()));
create policy sms_envois_own on public.sms_envois for select to authenticated using(proprietaire_id=(select auth.uid()));
create or replace function ekolocs_private.reserver_campagne_sms(p_id uuid,p_empreinte text,p_messages jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.sms_campagnes; credits integer; needed integer; amount integer;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 if p_id is null or p_empreinte is null or p_empreinte !~ '^[a-f0-9]{64}$' or p_messages is null or jsonb_typeof(p_messages)<>'array' then raise exception 'Campagne invalide'; end if;
 if jsonb_array_length(p_messages) not between 1 and 50 then raise exception '50 messages maximum'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,260031));
 select * into v from public.sms_campagnes where id=p_id;
 if found then
  if v.proprietaire_id<>auth.uid() or v.empreinte<>p_empreinte then raise exception 'Campagne différente'; end if;
  return jsonb_build_object('rows',(select coalesce(jsonb_agg(e order by e.id),'[]'::jsonb) from public.sms_envois e where campagne_id=p_id and proprietaire_id=auth.uid()));
 end if;
 if exists(select 1 from jsonb_array_elements(p_messages) m where
  coalesce(m->>'telephone','') !~ '^\+[1-9][0-9]{7,14}$' or length(coalesce(m->>'texte','')) not between 1 and 1600
  or coalesce(m->>'segments','') !~ '^(10|[1-9])$'
  or not exists(select 1 from public.locataires l where l.id=(m->>'locataire_id')::uuid and l.proprietaire_id=auth.uid())) then raise exception 'Destinataires invalides'; end if;
 select sum((m->>'segments')::integer),count(*) into needed,amount from jsonb_array_elements(p_messages) m;
 if amount<>(select count(distinct m->>'telephone') from jsonb_array_elements(p_messages) m) then raise exception 'Téléphones en doublon'; end if;
 select solde_segments into credits from public.sms_comptes where proprietaire_id=auth.uid() and actif for update;
 if not found or credits<needed then raise exception 'Compte désactivé ou solde de segments insuffisant'; end if;
 if (select count(*) from public.sms_envois where proprietaire_id=auth.uid() and cree_le>=now()-interval '24 hours')+amount>100 then raise exception 'Plafond de 100 messages sur 24 heures'; end if;
 insert into public.sms_campagnes(id,proprietaire_id,empreinte) values(p_id,auth.uid(),p_empreinte);
 update public.sms_comptes set solde_segments=solde_segments-needed where proprietaire_id=auth.uid();
 insert into public.sms_envois(campagne_id,proprietaire_id,locataire_id,telephone,texte,segments)
 select p_id,auth.uid(),(m->>'locataire_id')::uuid,m->>'telephone',m->>'texte',(m->>'segments')::integer from jsonb_array_elements(p_messages) m;
 return jsonb_build_object('rows',(select jsonb_agg(e order by e.id) from public.sms_envois e where campagne_id=p_id));
end $$;
create or replace function ekolocs_private.prendre_sms_campagne(p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.sms_envois;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 if not exists(select 1 from public.sms_comptes where proprietaire_id=auth.uid() and actif) then raise exception 'Compte SMS désactivé'; end if;
 update public.sms_envois set statut='sending' where id=p_id and proprietaire_id=auth.uid() and statut='reserved' returning * into v;
 return case when found then to_jsonb(v) else null end;
end $$;
create or replace function ekolocs_private.resultat_sms_campagne(p_id uuid,p_statut text,p_sid text,p_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.sms_envois;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 if p_statut is null or p_statut not in ('unknown','accepted','scheduled','queued','sending','sent','delivered','undelivered','failed','canceled') or (p_sid is not null and p_sid !~ '^SM[a-fA-F0-9]{32}$') or (p_code is not null and p_code !~ '^[0-9]{1,8}$') then raise exception 'Résultat invalide'; end if;
 select * into v from public.sms_envois where id=p_id and proprietaire_id=auth.uid() for update;
 if not found or v.statut='reserved' then raise exception 'Envoi introuvable ou non démarré'; end if;
 if v.twilio_sid is not null and v.twilio_sid is distinct from p_sid then raise exception 'Référence différente'; end if;
 if v.statut in ('delivered','undelivered','failed','canceled') and v.statut<>p_statut then return to_jsonb(v); end if;
 update public.sms_envois set statut=p_statut,twilio_sid=p_sid,code_erreur=p_code where id=p_id returning * into v;
 return to_jsonb(v);
end $$;
create table if not exists public.quittance_envois (
 id uuid primary key default gen_random_uuid(), proprietaire_id uuid not null references auth.users(id) on delete cascade,
 quittance_id uuid not null references public.quittances(id) on delete cascade,
 empreinte text not null, mode text not null check(mode in ('test','production')),statut text not null default 'reserved',
 resend_id text, cree_le timestamptz not null default now(), unique(proprietaire_id,quittance_id,empreinte)
);
create index if not exists quittance_envois_owner_date on public.quittance_envois(proprietaire_id,cree_le desc);
create index if not exists quittance_envois_receipt on public.quittance_envois(quittance_id);
alter table public.quittance_envois enable row level security;
revoke all on public.quittance_envois from anon, authenticated;
grant select on public.quittance_envois to authenticated;
create policy quittance_envois_own on public.quittance_envois for select to authenticated using(proprietaire_id=(select auth.uid()));
create or replace function ekolocs_private.reserver_envoi_quittance(p_quittance uuid,p_empreinte text,p_mode text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.quittance_envois;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 if p_empreinte is null or p_empreinte !~ '^[a-f0-9]{64}$' or p_mode is null or p_mode not in ('test','production') or not exists(select 1 from public.quittances where id=p_quittance and proprietaire_id=auth.uid()) then raise exception 'Envoi invalide'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_quittance::text,260032));
 select * into v from public.quittance_envois where proprietaire_id=auth.uid() and quittance_id=p_quittance and empreinte=p_empreinte for update;
 if found then
  if v.statut='failed' then update public.quittance_envois set statut='reserved' where id=v.id returning * into v;return jsonb_build_object('created',true,'record',to_jsonb(v));end if;
  return jsonb_build_object('created',false,'record',to_jsonb(v));
 end if;
 insert into public.quittance_envois(proprietaire_id,quittance_id,empreinte,mode) values(auth.uid(),p_quittance,p_empreinte,p_mode) returning * into v;
 return jsonb_build_object('created',true,'record',to_jsonb(v));
end $$;
create or replace function ekolocs_private.resultat_envoi_quittance(p_id uuid,p_statut text,p_resend text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.quittance_envois;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 if p_statut is null or p_statut not in ('accepted','delivered','bounced','complained','failed','unknown') or (p_resend is not null and p_resend !~ '^[a-fA-F0-9-]{36}$') then raise exception 'Résultat invalide'; end if;
 select * into v from public.quittance_envois where id=p_id and proprietaire_id=auth.uid() for update;
 if not found then raise exception 'Envoi introuvable'; end if;
 if v.resend_id is not null and v.resend_id is distinct from p_resend then raise exception 'Référence différente'; end if;
 if v.statut in ('delivered','bounced','complained') and v.statut<>p_statut then return to_jsonb(v); end if;
 update public.quittance_envois set statut=p_statut,resend_id=p_resend where id=p_id returning * into v;
 return to_jsonb(v);
end $$;
create or replace function public.reserver_campagne_sms(p_id uuid,p_empreinte text,p_messages jsonb) returns jsonb language sql security invoker set search_path='' as $$select ekolocs_private.reserver_campagne_sms(p_id,p_empreinte,p_messages)$$;
create or replace function public.prendre_sms_campagne(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select ekolocs_private.prendre_sms_campagne(p_id)$$;
create or replace function public.resultat_sms_campagne(p_id uuid,p_statut text,p_sid text,p_code text) returns jsonb language sql security invoker set search_path='' as $$select ekolocs_private.resultat_sms_campagne(p_id,p_statut,p_sid,p_code)$$;
create or replace function public.reserver_envoi_quittance(p_quittance uuid,p_empreinte text,p_mode text) returns jsonb language sql security invoker set search_path='' as $$select ekolocs_private.reserver_envoi_quittance(p_quittance,p_empreinte,p_mode)$$;
create or replace function public.resultat_envoi_quittance(p_id uuid,p_statut text,p_resend text) returns jsonb language sql security invoker set search_path='' as $$select ekolocs_private.resultat_envoi_quittance(p_id,p_statut,p_resend)$$;
do $$declare r record;begin
 for r in select n.nspname,p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','ekolocs_private') and p.proname in ('reserver_campagne_sms','prendre_sms_campagne','resultat_sms_campagne','reserver_envoi_quittance','resultat_envoi_quittance') loop
 execute format('revoke all on function %s from public, anon, authenticated',r.signature);
 execute format('grant execute on function %s to authenticated',r.signature);
 end loop;
end$$;
commit;
notify pgrst,'reload schema';
