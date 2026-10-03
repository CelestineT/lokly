-- Frais de courtage liés à l'acquisition du bien
alter table public.biens
  add column if not exists frais_courtage numeric default 0;
