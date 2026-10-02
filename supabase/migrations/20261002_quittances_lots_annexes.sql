-- LOKLY — Snapshot des lots annexes sur les quittances
-- À exécuter dans Supabase > SQL Editor avant le déploiement du code associé.

alter table public.quittances
  add column if not exists lots_annexes_total numeric(10,2) not null default 0;

alter table public.quittances
  add column if not exists lots_annexes_detail jsonb not null default '[]'::jsonb;

alter table public.quittances
  drop constraint if exists quittances_lots_annexes_total_non_negatif;

alter table public.quittances
  add constraint quittances_lots_annexes_total_non_negatif
  check (lots_annexes_total >= 0);

comment on column public.quittances.lots_annexes_total is
  'Montant total des lots annexes facturés pour la période, figé lors de la création de la quittance.';

comment on column public.quittances.lots_annexes_detail is
  'Snapshot JSON des lots annexes facturés (type, numéro, prix) afin de préserver l’historique de la quittance.';
