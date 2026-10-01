-- V3.4 — Baux et occupants
-- Regroupe plusieurs occupants sous un même bail et fiabilise le rattachement aux lots.

create table if not exists public.baux (
  id uuid primary key default gen_random_uuid(),
  proprietaire_id uuid not null references auth.users(id) on delete cascade,
  bien_id uuid not null references public.biens(id) on delete cascade,
  lot_id uuid references public.lots(id) on delete set null,
  type_occupation text not null default 'individuel' check (type_occupation in ('individuel','bail_commun','colocation')),
  date_entree date not null,
  date_sortie date,
  loyer_hc numeric not null default 0,
  charges numeric not null default 0,
  caution numeric,
  caution_payee boolean not null default false,
  duree_bail_ans integer not null default 3,
  echeance_bail date,
  mode_paiement text,
  commentaire text,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.locataires add column if not exists bail_id uuid references public.baux(id) on delete set null;
alter table public.locataires add column if not exists est_principal boolean not null default false;

create index if not exists idx_baux_proprietaire on public.baux(proprietaire_id);
create index if not exists idx_baux_bien on public.baux(bien_id);
create index if not exists idx_baux_lot on public.baux(lot_id);
create index if not exists idx_locataires_bail on public.locataires(bail_id);

alter table public.baux enable row level security;

drop policy if exists "baux_select_owner" on public.baux;
create policy "baux_select_owner" on public.baux for select using (auth.uid() = proprietaire_id);
drop policy if exists "baux_insert_owner" on public.baux;
create policy "baux_insert_owner" on public.baux for insert with check (auth.uid() = proprietaire_id);
drop policy if exists "baux_update_owner" on public.baux;
create policy "baux_update_owner" on public.baux for update using (auth.uid() = proprietaire_id) with check (auth.uid() = proprietaire_id);
drop policy if exists "baux_delete_owner" on public.baux;
create policy "baux_delete_owner" on public.baux for delete using (auth.uid() = proprietaire_id);
