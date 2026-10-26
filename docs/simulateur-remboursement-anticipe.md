# Ekolocs — Simulateur de remboursement anticipé ponctuel

## Accès

Dans **Crédits immobiliers**, choisir **Simuler un remboursement** sur le crédit concerné. Le simulateur est réservé au propriétaire connecté. Aucune migration SQL n’est nécessaire.

Le premier cas d’usage compare une même somme remboursée en une fois selon trois colonnes :

- situation sans remboursement anticipé ;
- mensualité habituelle conservée et durée raccourcie ;
- mensualité réduite, avec la durée restante du scénario initial comme cible.

Un montant égal au capital restant dû simule le solde total. Le simulateur n’enregistre pas de paiement, ne modifie pas le crédit et n’envoie aucune instruction à la banque. Les essais sont temporaires et disparaissent au rechargement de la page.

## Paramètres

- Mois du remboursement, courant ou futur.
- Capital restant dû **après l’échéance normale du mois choisi** : prérempli par une estimation des paramètres enregistrés, modifiable avec le montant bancaire.
- Taux nominal annuel fixe et mensualité hors assurance, préremplis et ajustables pour la simulation.
- Montant du remboursement ponctuel, strictement positif et au plus égal au capital restant dû.
- Frais et indemnités : facultatifs. Un champ vide signifie « inconnus », pas zéro. Renseigner zéro uniquement si aucun frais ne s’applique.
- Assurance : exclue par défaut. Une cotisation mensuelle fixe peut être intégrée explicitement ; le montant enregistré est alors proposé. Une assurance calculée sur le capital restant dû n’est pas simulée dans cette version.

Les frais, montants minimums et options autorisées restent ceux du contrat. Les informations du crédit ne suffisent pas à les déterminer automatiquement. Référence consultée : [Ministère de l’Économie — remboursement anticipé](https://www.economie.gouv.fr/particuliers/emprunter-et-sassurer/rembourser-son-credit-immobilier-avant-le-terme-comment-ca).

## Calcul et résultats

La simulation porte sur un prêt amortissable à taux fixe, sans différé futur ou en cours. En présence d’un différé enregistré, sélectionner un mois postérieur à sa fin. Les modalités incomplètes du différé sont signalées.

Le remboursement est supposé réalisé après l’échéance du mois sélectionné ; le premier paiement simulé est au mois suivant. Il n’y a ni calcul d’intérêts journaliers, ni reconstitution de déblocages progressifs. L’estimation bancaire du capital permet d’affiner le point de départ.

Le moteur calcule chaque mois les intérêts au taux nominal annuel divisé par 12. Les intérêts sont arrondis au centime, avec un calcul entier pour éviter les erreurs de demi-centime. La dernière échéance est ajustée au solde. Le calcul de la mensualité réduite conserve la durée restante initialement calculée, avec ajustement de la dernière échéance aux arrondis.

Les résultats indiquent mensualité, nombre d’échéances, mois de fin, intérêts et assurance restants, frais, économie estimée et baisse de la charge mensuelle. Les échéanciers peuvent être consultés pour chaque option. La date contractuelle enregistrée est rappelée pour permettre une comparaison avec l’échéancier bancaire.

- Trésorerie mobilisée = remboursement ponctuel + frais connus.
- Économie après frais = intérêts évités + assurance évitée si intégrée − frais.
- Le capital remboursé n’est pas une économie de coût du crédit.
- L’assurance fixe est maintenue chaque mois jusqu’au solde, et s’arrête ensuite dans la simulation.
- La fiscalité et le rendement alternatif des fonds utilisés ne sont pas simulés.

Sans frais renseignés, l’économie après frais et la trésorerie totale restent à préciser. Une économie négative reste affichée. Les crédits non amortissables avec la mensualité saisie, les montants non valides et les calculs dépassant 600 mois sont refusés.

## Vérification rapide

Exemple de test : capital restant dû de 12 000 €, taux de 0 %, mensualité de 1 000 €, remboursement ponctuel de 3 000 €, frais de 0 €, assurance exclue.

- Sans remboursement : 12 échéances de 1 000 €.
- Durée réduite : 9 échéances de 1 000 €, soit 3 mois gagnés.
- Mensualité réduite : 12 échéances de 750 €, soit 250 € de baisse mensuelle.

Tester également un taux positif, des frais inconnus, des frais élevés, un remboursement total, un montant supérieur au capital et un changement de mois après calcul. Modifier un paramètre doit effacer le résultat précédent jusqu’à une nouvelle simulation. Le financement enregistré doit rester identique.
