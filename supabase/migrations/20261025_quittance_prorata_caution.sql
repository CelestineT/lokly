-- Réexécutable. Aucun paiement ou document existant modifié.
BEGIN;
-- Inclut les colonnes de la précédente évolution si elle n’a pas encore été appliquée.
ALTER TABLE public.quittances
 ADD COLUMN IF NOT EXISTS regularisation_charges numeric(12,2) NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS regularisation_periode text,
 ADD COLUMN IF NOT EXISTS caution_montant numeric(12,2),
 ADD COLUMN IF NOT EXISTS prorata_detail jsonb;
COMMIT;
NOTIFY pgrst, 'reload schema';
