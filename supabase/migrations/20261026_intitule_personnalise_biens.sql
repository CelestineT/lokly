BEGIN;
-- Additive: preserve all existing property names and lot titles as entered.
ALTER TABLE public.biens ADD COLUMN IF NOT EXISTS nom_personnalise text;
COMMENT ON COLUMN public.biens.nom_personnalise IS 'Intitulé complémentaire du bien, distinct de son nom. Disponible pour tous les types de biens.';
NOTIFY pgrst, 'reload schema';
COMMIT;
