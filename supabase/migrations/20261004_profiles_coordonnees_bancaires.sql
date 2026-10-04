-- Coordonnées bancaires facultatives du bailleur, utilisées notamment sur les quittances.
alter table public.profiles
  add column if not exists titulaire_compte text,
  add column if not exists iban text,
  add column if not exists bic text;
