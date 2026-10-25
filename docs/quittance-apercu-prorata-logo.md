# Aperçu, prorata, date de signature et présentation des quittances

## Parcours

« Générer et prévisualiser » enregistre la quittance puis ouvre sa fiche avec un aperçu PDF. Le téléchargement est une action séparée. L’aperçu utilise la même route et les mêmes contrôles de propriétaire que le téléchargement ; son Content-Disposition est inline. Un lien plein écran est fourni pour les navigateurs mobiles. La signature et l’envoi restent une action volontaire distincte, non déclenchée par l’aperçu.

## Montants

Pour une entrée après le premier jour du mois concerné, calcul automatique du loyer HC et de la provision sur charges : montant mensuel × jours d’occupation / jours réels du mois, jour d’entrée inclus, arrondi au centime pour chaque ligne. La date d’entrée du bail est prioritaire dans un bail commun : l’arrivée d’un autre occupant ne déclenche pas un nouveau prorata. Les mois suivants restent pleins. Les annexes conservent les règles de leurs rattachements, sans nouveau prorata automatique.

Le propriétaire peut cocher « Modifier les montants pour cette quittance » et ajuster le loyer et les charges. Le serveur valide et enregistre ces montants sans modifier le bail. Sans cette option, il recalcule lui-même les montants automatiques. Une valeur personnalisée négative ou invalide est refusée. Le détail du calcul et le caractère manuel sont sauvegardés avec le document. Le paiement restant est contrôlé après prorata et régularisation, indépendamment du solde antérieur. Les montants sont conservés dans le retour vers la quittance après saisie du paiement.

La case caution fait apparaître son montant sur une ligne dédiée. Il s’agit d’un dépôt de garantie, indiqué hors total échéance : il n’est pas ajouté au loyer ni compté comme un nouvel encaissement. Le montant du bail est sauvegardé avec la quittance pour les nouvelles créations.

## PDF

Logo fourni par l’utilisatrice, conservé à l’identique dans public/ekolocs-logo.jpeg. Téléphones du bailleur et du locataire s’ils sont renseignés. Suppression du petit numéro technique du lot dans le bloc logement (l’intitulé personnalisé demeure). En-tête INFORMATION. Titres LIBELLÉ / MONTANT HC / MONTANT TTC et TOTAL ÉCHÉANCE en gras. Pied de page : « parc immobilier à destination de tous publics » à gauche et ekolocs.fr à droite, sans date à droite. Bordure extérieure renforcée avec ombre discrète. Les lignes facultatives sans montant ne sont pas affichées.

La date choisie à la création est enregistrée puis utilisée dans le PDF téléchargé et le PDF envoyé. L’action de signature/envoi ne remplace plus cette date par la date du jour. Les documents sans date exploitable indiquent « Non renseignée », au lieu d’une date inventée. Le formatage respecte le jour civil saisi.

## Supabase

Exécuter supabase/migrations/20261025_quittance_prorata_caution.sql dans le SQL Editor du projet utilisé. Il ajoute caution_montant et prorata_detail et inclut les colonnes de régularisation si la migration précédente n’a pas encore été exécutée. Aucune donnée existante n’est supprimée ou réécrite. Aucune exécution directe dans la base réelle n’a été effectuée ici. Une base de production distincte nécessite la même migration.

## Vérifications

Tests du serveur et des composants réels : prorata en mois de 28/29/30/31 jours, premier/dernier jour, mois suivant, montants manuels et données du bail inchangées, encaissement insuffisant, caution sans double compte, saisie invalide, aperçu avant téléchargement, accès authentifié, date conservée après signature, absence d’envoi réel dans les tests. Contrôle du logo dans le traçage des fichiers de déploiement pour les deux routes PDF. Contrôle visuel du PDF fictif complet avec logo, téléphones, prorata et caution. Tests existants de régularisation, paiement, loyers historiques, annexes retirées, cohérence des vues et documents/financement. TypeScript et build Next.js.
