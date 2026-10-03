-- Coordonnées du bailleur affichées sur les quittances
alter table public.profiles
  add column if not exists email text,
  add column if not exists telephone text;

-- L'adresse du compte reste la valeur de repli côté application.
