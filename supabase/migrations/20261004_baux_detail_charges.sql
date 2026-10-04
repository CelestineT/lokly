-- Détail facultatif des charges incluses dans le bail.
-- Le montant global reste stocké dans baux.charges.
alter table public.baux
  add column if not exists detail_charges text[] not null default '{}';
