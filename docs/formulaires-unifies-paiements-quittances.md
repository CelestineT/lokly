# Formulaires de paiement et quittance unifiés

## Comportement

Créer et modifier un paiement utilisent le même composant RentalEntryForm. Le bouton Modifier de l’historique ouvre ce formulaire avec les données enregistrées. La fiche quittance dispose également de Modifier, qui réutilise le même composant. Les corrections passent par un UPDATE sous contrôle de l’utilisateur propriétaire ; elles ne créent pas un deuxième enregistrement. Une quittance corrigée repasse à signer, sans envoi automatique. Les autres documents ne sont pas réécrits.

Loyer, provision sur charges, montants de chaque annexe, régularisation, caution, solde antérieur et commentaire sont modifiables, quel que soit le mois. Le formulaire adapte uniquement les champs propres au paiement (montant reçu, date et mode) et à la quittance (date de signature). Les loyers et charges contractuels du bail restent inchangés.

Le calcul automatique des annexes prend l’intersection du mois, des dates de rattachement de l’annexe et de la date d’entrée du bail. Chaque ligne est calculée et arrondie indépendamment, jour de début et jour de fin inclus. Les montants proposés restent ajustables. Lors de la modification d’une ancienne quittance dont les annexes n’avaient pas de détail de prorata, leurs montants partiels sont recalculés dans le formulaire avec un message de vérification ; rien n’est écrit avant validation. Les ajustements sauvegardés avec le nouveau détail restent conservés. Le serveur relit les rattachements, refuse un lot extérieur au bail et vérifie les montants. Le bouton Rétablir les montants automatiques permet de revenir au calcul de référence.

L’aperçu PDF et les infobulles existantes restent accessibles. Si un paiement manque, le lien vers sa saisie conserve le brouillon de quittance dans la session du navigateur, sous une clé propre à ce bail et ce mois. Ce brouillon est retiré après enregistrement de la quittance. Aucune note privée n’est enregistrée dans ce brouillon.

## Caution et totaux

La caution incluse fait partie du total échéance. Le total payé ajoute uniquement la caution réellement encaissée, renseignée séparément. Le paiement stocke le montant reçu hors caution dans montant et la caution encaissée dans caution_recue : les analyses de loyers ne transforment pas le dépôt en revenu locatif. La liste des paiements présente leur somme et indique la part caution.

La quittance conserve ses montants et sa caution encaissée. Le PDF ne rajoute pas la caution une seconde fois à un total qui l’inclut déjà. Pour les anciens documents où elle était seulement informative, l’affichage du PDF ajoute la caution à l’échéance une seule fois. Son caractère payé est déterminé par les données disponibles, sans supposer un encaissement inexistant. Le solde antérieur reste une dette distincte ; le contrôle permettant la création de quittance porte sur le loyer/charges/annexes et la régularisation du mois.

## PDF

Logo réduit de 205 à 185 points et légèrement remonté. En-têtes COORDONNÉES BAILLEUR et INFORMATIONS LOCATAIRE sur le même fond que les autres encadrés. MONTANT IMPAYÉ et sa valeur en rouge. Pied de page Parc immobilier à destination de tous publics ; à droite Notre site: ekolocs.fr, avec une annotation PDF cliquable vers https://ekolocs.fr. La date de signature choisie reste conservée.

## Mise en service

Exécuter dans Supabase SQL Editor : supabase/migrations/20261026_saisie_paiements_quittances.sql. Le script est réexécutable et ajoute les champs de ventilation du paiement et de caution ; il n’efface aucune donnée. L’application n’a pas de connexion administrateur à la base réelle depuis cet environnement, donc la migration reste à exécuter par l’administratrice. Toute base de production séparée nécessite la même migration.

## Vérifications

Le test unified-entry-regressions exécute les quatre parcours avec les composants réels, ainsi que l’aller-retour quittance/paiement avec conservation du brouillon. Il contrôle la modification sur le même identifiant, les filtres propriétaire, l’absence de doublon, les erreurs d’écriture, les montants sur un mois plein et un mois partiel, le prorata indépendant de chaque annexe, le refus d’une annexe étrangère, la caution comptée une fois et la différence due/encaissée. Les tests existants de paiement, révisions, régularisation, retrait d’annexe et PDF ont été adaptés au formulaire partagé tout en conservant les assertions de calcul et d’historique. Les anciennes branches d’interface supprimées sont couvertes par le test commun. Contrôle visuel du PDF, annotation du lien vérifiée dans les objets du PDF, TypeScript et build Next.js. Les données utilisées sont fictives.
