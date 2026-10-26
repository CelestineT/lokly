-- Migration additive : crédits existants sans différé et classement actuel préservés.
begin;
alter table public.financements
 add column if not exists differe_type text not null default 'aucun' check (differe_type in ('aucun','partiel','total')),
 add column if not exists differe_debut date,
 add column if not exists differe_fin date,
 add column if not exists differe_mensualite numeric(12,2) check (differe_mensualite >= 0);
do $$ begin
 if not exists(select 1 from pg_constraint where conname='financements_differe_valide' and conrelid='public.financements'::regclass) then
 alter table public.financements add constraint financements_differe_valide check (
 differe_type='aucun' or (
 differe_debut is not null and differe_fin is not null and differe_mensualite is not null
 and date_debut is not null and differe_debut >= date_debut
 and differe_fin >= differe_debut
 and differe_fin < (differe_debut + interval '36 months')::date
 and (date_fin is null or differe_fin <= date_fin)));
 end if;
end $$;
alter table public.profiles add column if not exists ordre_affichage jsonb not null default '{}'::jsonb check(jsonb_typeof(ordre_affichage)='object');
create or replace function public.enregistrer_ordre_affichage(p_scope text,p_ids text[])
returns void language plpgsql security invoker set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 if p_scope is null or length(p_scope)>120 or not (p_scope='biens' or p_scope like 'locataires:%') then raise exception 'Classement invalide'; end if;
 if p_ids is null or cardinality(p_ids)>1000 or exists(select 1 from unnest(p_ids) x where x is null or length(x)>160) then raise exception 'Liste invalide'; end if;
 update public.profiles set ordre_affichage=jsonb_set(coalesce(ordre_affichage,'{}'::jsonb),array[p_scope],to_jsonb(p_ids),true) where id=auth.uid();
 if not found then raise exception 'Profil introuvable'; end if;
end $$;
revoke all on function public.enregistrer_ordre_affichage(text,text[]) from public;
grant execute on function public.enregistrer_ordre_affichage(text,text[]) to authenticated;
notify pgrst, 'reload schema';
commit;
