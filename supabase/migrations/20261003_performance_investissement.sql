-- Données nécessaires au suivi de la performance de l'investissement
alter table public.biens
  add column if not exists valeur_actuelle numeric,
  add column if not exists valeur_actuelle_date date;

comment on column public.biens.valeur_actuelle is 'Valeur actuelle du bien retenue par le bailleur pour les indicateurs de performance et le TRI.';
comment on column public.biens.valeur_actuelle_date is 'Date à laquelle la valeur actuelle du bien a été estimée ou mise à jour.';
