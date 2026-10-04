-- Identité structurée des locataires
alter table public.locataires
  add column if not exists civilite text,
  add column if not exists prenom text,
  add column if not exists nom_famille text;

-- Contrôle léger de la civilité sans bloquer les anciennes données
alter table public.locataires
  drop constraint if exists locataires_civilite_check;

alter table public.locataires
  add constraint locataires_civilite_check
  check (civilite is null or civilite in ('M.', 'Mme'));

-- Le champ historique `nom` reste conservé pour compatibilité avec
-- les quittances et les données existantes. Les nouveaux écrans
-- l'alimenteront avec : Civilité + Nom + Prénom.
