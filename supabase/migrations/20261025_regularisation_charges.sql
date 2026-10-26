-- Ajout uniquement : aucune donnée existante modifiée ou supprimée.
BEGIN;
ALTER TABLE public.quittances
 ADD COLUMN IF NOT EXISTS regularisation_charges numeric(12,2) NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS regularisation_periode text;
ALTER TABLE public.quittances DROP CONSTRAINT IF EXISTS quittances_regularisation_periode_valide;
ALTER TABLE public.quittances ADD CONSTRAINT quittances_regularisation_periode_valide
 CHECK (regularisation_charges = 0 OR
 (regularisation_periode IS NOT NULL AND length(btrim(regularisation_periode)) BETWEEN 1 AND 120));
COMMIT;
NOTIFY pgrst, 'reload schema';
