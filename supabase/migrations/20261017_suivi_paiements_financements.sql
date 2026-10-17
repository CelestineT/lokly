-- Ajouts uniquement : aucune donnée ni contrainte existante n'est supprimée.
-- À exécuter dans le SQL Editor du projet Supabase utilisé par l'application.
begin;
alter table public.paiements add column if not exists solde_anterieur numeric(12,2) not null default 0 check (solde_anterieur >= 0);
alter table public.locataires add column if not exists qualite_interne text;
alter table public.financements add column if not exists postes_finances jsonb not null default '[]'::jsonb check (jsonb_typeof(postes_finances) = 'array');
comment on column public.locataires.qualite_interne is 'Note privée du bailleur. Ne pas inclure dans les PDF ou les courriels aux locataires.';
notify pgrst, 'reload schema';
commit;
