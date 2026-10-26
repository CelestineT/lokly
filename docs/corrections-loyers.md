# Ekolocs — Corriger un montant de loyer

## Activation en recette

La migration des révisions `20261018_revisions_loyers.sql` doit déjà être appliquée. Dans le SQL Editor du **projet Supabase utilisé par la recette**, exécuter intégralement [20261019_corrections_loyers.sql](../supabase/migrations/20261019_corrections_loyers.sql), puis actualiser Ekolocs.

Ce script ajoute un journal de corrections et une fonction réservée aux utilisateurs authentifiés. Son exécution ne corrige aucun montant existant et ne supprime ni bail, ni occupant, ni historique, ni quittance. Il peut être exécuté à nouveau sans effacer le journal.

## Utilisation

Dans **Locataires → Consulter → Modifier le bail → Historique et révisions du loyer** :

- **Ajouter une révision** : nouveau montant à une nouvelle date, avec conservation des montants antérieurs.
- **Corriger le montant initial** : rectifier le montant de référence, jusqu’à la première révision.
- **Corriger ce montant**, sous une révision : rectifier cette seule révision, sans déplacer sa date ni changer les révisions suivantes.

Les champs de loyer et charges en haut du formulaire sont un récapitulatif en lecture seule. Une correction réussie les actualise immédiatement si la période corrigée s’applique aujourd’hui.

Un motif est obligatoire. L’ancien montant, le nouveau montant, la date et l’auteur sont conservés dans le journal. Les corrections se consultent dans **Historique des corrections** sur le même écran.

Une correction qui contredit une quittance déjà créée pour la période est refusée. Le document existant reste inchangé ; ajouter une révision à une date ultérieure pour faire évoluer le loyer. Si quelqu’un a changé les montants depuis l’ouverture de l’écran, actualiser avant de réessayer.

## Vérification après activation

Sur un bail de test, sans quittance sur la période :

1. Corriger un montant initial et vérifier la fiche, la synthèse et le journal.
2. Corriger une révision passée puis une révision future. Vérifier que les autres périodes gardent leurs montants.
3. Vérifier qu’une correction incompatible avec une quittance existante est refusée, sans modifier le document.
4. Vérifier qu’un bail résilié reste consultable dans **Résiliations et fins de bail**, avec ses dates et son historique.

Les tests automatisés de l’interface et des actions ne remplacent pas l’exécution de la migration et ce contrôle sur la base de recette.
