-- V3.3 — Crédit et financement
-- Un financement est rattaché à un bien et à son propriétaire.
create table if not exists public.financements (
  id uuid primary key default gen_random_uuid(),
  proprietaire_id uuid not null references auth.users(id) on delete cascade,
  bien_id uuid not null references public.biens(id) on delete cascade,
  montant_emprunte numeric(12,2),
  apport_personnel numeric(12,2),
  taux_nominal numeric(6,3),
  mensualite numeric(12,2),
  duree_mois integer,
  date_debut date,
  date_fin date,
  assurance_mensuelle numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financements_bien_unique unique (bien_id),
  constraint financements_montants_positifs check (
    coalesce(montant_emprunte,0) >= 0 and
    coalesce(apport_personnel,0) >= 0 and
    coalesce(mensualite,0) >= 0 and
    coalesce(assurance_mensuelle,0) >= 0 and
    coalesce(taux_nominal,0) >= 0 and
    coalesce(duree_mois,0) >= 0
  )
);

alter table public.financements enable row level security;

drop policy if exists "financements_select_own" on public.financements;
create policy "financements_select_own" on public.financements for select using (auth.uid() = proprietaire_id);
drop policy if exists "financements_insert_own" on public.financements;
create policy "financements_insert_own" on public.financements for insert with check (auth.uid() = proprietaire_id);
drop policy if exists "financements_update_own" on public.financements;
create policy "financements_update_own" on public.financements for update using (auth.uid() = proprietaire_id) with check (auth.uid() = proprietaire_id);
drop policy if exists "financements_delete_own" on public.financements;
create policy "financements_delete_own" on public.financements for delete using (auth.uid() = proprietaire_id);

create index if not exists financements_proprietaire_id_idx on public.financements(proprietaire_id);
create index if not exists financements_bien_id_idx on public.financements(bien_id);
