BEGIN;
ALTER TABLE public.paiements
 ADD COLUMN IF NOT EXISTS detail_echeance jsonb,
 ADD COLUMN IF NOT EXISTS solde_anterieur numeric(12,2),
 ADD COLUMN IF NOT EXISTS caution_recue numeric(12,2);
ALTER TABLE public.quittances
 ADD COLUMN IF NOT EXISTS regularisation_charges numeric(12,2) NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS regularisation_periode text,
 ADD COLUMN IF NOT EXISTS caution_montant numeric(12,2),
 ADD COLUMN IF NOT EXISTS caution_encaissee numeric(12,2),
 ADD COLUMN IF NOT EXISTS caution_total_inclus boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS prorata_detail jsonb;
COMMIT;
NOTIFY pgrst, 'reload schema';
