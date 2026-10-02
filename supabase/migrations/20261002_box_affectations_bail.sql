-- LOKLY — Affectation des box/parkings/garages/caves aux baux
-- À exécuter dans Supabase > SQL Editor > New query.
-- Migration additive : ne supprime ni ne modifie les rattachements existants des lots.

-- 1. Prix mensuel de référence du lot annexe.
alter table public.lots
  add column if not exists prix_mensuel numeric(10,2);

alter table public.lots
  drop constraint if exists lots_prix_mensuel_non_negatif;
alter table public.lots
  add constraint lots_prix_mensuel_non_negatif
  check (prix_mensuel is null or prix_mensuel >= 0);

-- 2. Historique des affectations d'un lot annexe à un bail.
create table if not exists public.affectations_lots_baux (
  id uuid primary key default uuid_generate_v4(),
  proprietaire_id uuid references auth.users(id) on delete cascade not null,
  lot_id uuid references public.lots(id) on delete cascade not null,
  bail_id uuid references public.baux(id) on delete cascade not null,
  date_debut date not null,
  date_fin date,
  prix_mensuel numeric(10,2) not null,
  created_at timestamptz not null default now(),
  constraint affectations_lots_baux_prix_non_negatif check (prix_mensuel >= 0),
  constraint affectations_lots_baux_dates_valides check (date_fin is null or date_fin >= date_debut)
);

create index if not exists affectations_lots_baux_lot_idx
  on public.affectations_lots_baux(lot_id);
create index if not exists affectations_lots_baux_bail_idx
  on public.affectations_lots_baux(bail_id);
create index if not exists affectations_lots_baux_periode_idx
  on public.affectations_lots_baux(date_debut, date_fin);

-- Un même lot ne peut avoir qu'une affectation actuellement active.
create unique index if not exists affectations_lots_baux_un_actif_par_lot_idx
  on public.affectations_lots_baux(lot_id)
  where date_fin is null;

-- 3. Sécurité : chaque propriétaire n'accède qu'à ses affectations.
alter table public.affectations_lots_baux enable row level security;

drop policy if exists "proprio_affectations_lots_baux" on public.affectations_lots_baux;
create policy "proprio_affectations_lots_baux"
  on public.affectations_lots_baux
  for all
  using (auth.uid() = proprietaire_id)
  with check (auth.uid() = proprietaire_id);

-- 4. Contrôle optionnel après exécution.
-- select column_name, data_type from information_schema.columns
-- where table_schema='public' and table_name='lots' and column_name='prix_mensuel';
-- select table_name from information_schema.tables
-- where table_schema='public' and table_name='affectations_lots_baux';
