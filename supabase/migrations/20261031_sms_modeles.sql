-- Modèles privés de chaque propriétaire. Aucun envoi de SMS.
create table if not exists public.sms_modeles (
 id uuid primary key default gen_random_uuid(),
 proprietaire_id uuid not null references auth.users(id) on delete cascade,
 titre text not null check (char_length(trim(titre)) between 1 and 120),
 contenu text not null check (char_length(trim(contenu)) between 1 and 1600),
 usage text not null check (usage in ('group','individual')),
 origine text,
 cree_le timestamptz not null default now(),
 unique(proprietaire_id,origine)
);
alter table public.sms_modeles enable row level security;
drop policy if exists sms_modeles_owner on public.sms_modeles;
create policy sms_modeles_owner on public.sms_modeles for all to authenticated
 using (proprietaire_id=auth.uid()) with check (proprietaire_id=auth.uid());
revoke all on public.sms_modeles from anon;
grant select,insert,update,delete on public.sms_modeles to authenticated;
