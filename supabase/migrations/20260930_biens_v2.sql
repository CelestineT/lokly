-- Ecolox / Lokly — Biens V2
-- A executer dans Supabase SQL Editor avant de tester la branche.

alter table biens
  add column if not exists specificite text,
  add column if not exists parent_bien_id uuid references biens(id) on delete set null,
  add column if not exists rattachement_type text,
  add column if not exists locataire_externe_nom text,
  add column if not exists locataire_externe_email text;

-- Les biens non habitables et "autre" n'ont pas de type de location.
alter table biens alter column type_location drop not null;

-- Dépenses V2 : qualification des travaux et déductibilité déclarative.
alter table depenses
  add column if not exists type_travaux text,
  add column if not exists deductible_fiscalement boolean;

create index if not exists biens_parent_bien_id_idx on biens(parent_bien_id);
