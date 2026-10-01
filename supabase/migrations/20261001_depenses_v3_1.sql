-- Ekolocs V3.1 — alignement du schema des depenses avec le formulaire actuel
-- Migration additive : conserve les donnees existantes.

alter table public.depenses
  add column if not exists date_depense date,
  add column if not exists description text,
  add column if not exists type_travaux text,
  add column if not exists deductible_fiscalement boolean not null default false;

-- Reprend l'ancienne date si la table possede encore la colonne historique "date".
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'depenses' and column_name = 'date'
  ) then
    execute 'update public.depenses set date_depense = date where date_depense is null';
  end if;
end $$;

-- Le formulaire autorise une depense non rattachee a un bien precis.
alter table public.depenses alter column bien_id drop not null;

-- Le formulaire V3 utilise description plutot que l'ancien libelle obligatoire.
alter table public.depenses alter column libelle drop not null;
