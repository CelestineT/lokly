-- Identités structurées pour l'affichage des quittances
alter table if exists profiles
  add column if not exists civilite text;

alter table if exists locataires
  add column if not exists civilite text,
  add column if not exists prenom text;

-- Les anciens locataires restent compatibles : leur champ `nom` historique
-- continue d'être utilisé tant que prénom/civilité ne sont pas renseignés.
