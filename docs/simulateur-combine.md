# Ekolocs — remboursement ponctuel et hausse de mensualité

Accès : Crédits immobiliers → Simuler un remboursement → Remboursement + hausse. Route : `/dashboard/credits/[id]/simuler/combine`.

## Objectif

Répondre à « Si je rembourse une somme maintenant puis augmente ma mensualité, quand mon crédit sera-t-il soldé ? ». Comparer trois situations : crédit actuel, même remboursement ponctuel avec mensualité habituelle, remboursement ponctuel puis mensualité plus élevée.

## Paramètres et calendrier

Le capital est celui restant après l’échéance du mois choisi (courant ou futur). Le remboursement ponctuel a lieu ensuite, ce même mois. La mensualité augmentée commence le mois suivant, de façon permanente jusqu’à extinction du crédit. Le capital estimé, le taux et la mensualité actuelle peuvent être ajustés d’après l’échéancier bancaire pour cet essai.

Montant ponctuel strictement positif, au maximum égal au capital. Nouvelle mensualité hors assurance strictement supérieure à l’actuelle si du capital reste à rembourser. Frais facultatifs distincts pour le remboursement et la hausse : vide signifie inconnus, zéro aucun frais. Assurance fixe facultative, exclue par défaut.

Si le remboursement solde le capital, le champ de nouvelle mensualité et les frais de hausse sont désactivés. La simulation ne conserve ni hausse ni frais de hausse, même si ces champs avaient été remplis auparavant. Aucune échéance future dans ce cas.

## Lecture des résultats

- Capital après remboursement et trésorerie à prévoir au départ (capital ponctuel + frais connus des deux actions). Si un frais reste inconnu : capital + frais à préciser.
- Trois échéanciers comparés : mensualité, date de fin, nombre d’échéances, intérêts, assurance fixe, frais et coût d’intérêts/assurance/frais. Le capital n’est pas inclus dans cette mesure du coût financier.
- Effort mensuel supplémentaire, mois gagnés, intérêts/assurance évités, total des frais et économies avant/après frais pour le scénario combiné par rapport au crédit actuel.
- Apport de la hausse par rapport au remboursement seul : mois supplémentaires gagnés, intérêts et gain supplémentaire après frais de hausse. Le gain marginal inclut l’assurance fixe évitée si sélectionnée ; les frais du remboursement ponctuel sont communs aux deux scénarios et ne sont pas soustraits une seconde fois.
- Une économie négative reste affichée comme surcoût. Frais inconnus : pas d’économie nette inventée. Le capital remboursé d’avance n’est jamais présenté comme une économie.

Les frais de chaque action sont réglés séparément du crédit. Le tableau du remboursement seul ne comporte que les frais du remboursement ; celui du scénario combiné comporte les deux frais, chacun une fois. La dernière échéance est ajustée au solde restant. Les échéanciers affichent les paiements futurs après le remboursement ponctuel, rappelé séparément au-dessus.

## Périmètre et non-régression

Prêt amortissable à taux fixe, calcul mensuel au centime, après tout différé enregistré, 600 échéances maximum. Pas de fiscalité, d’assurance variable, d’intérêts journaliers ni de déblocages progressifs. Conditions de remboursement et de modulation, plafonds, minimums et frais à confirmer avec la banque.

Aucune écriture en base, aucune modification du crédit, aucune migration SQL. Le chargement authentifié et filtré par propriétaire est réutilisé. Le moteur du remboursement ponctuel sert de référence sans en modifier le comportement. Les quatre scénarios précédents restent accessibles. Tout changement de champ invalide les résultats ; réinitialisation disponible.

## Recette

1. Situation octobre 2026, capital 12 000 €, taux 0 %, mensualité 1 000 €, remboursement 3 000 €, nouvelle mensualité 1 500 € : 12 mois au départ, 9 avec remboursement seul, 6 avec les deux actions. Fin combinée avril 2027. Capital restant 9 000 €, effort 500 €, trois mois gagnés grâce à la hausse en plus du remboursement seul.
2. Assurance fixe 30 €, frais du remboursement 50 €, frais de hausse 20 € : assurance évitée 180 €, frais totaux 70 €, économie nette 110 €, trésorerie initiale 3 070 €. Gain marginal de la hausse : 90 € d’assurance évitée moins 20 € = 70 €.
3. Capital 2 000 €, taux annuel 12 %, mensualité 510 €, remboursement 500 €, nouvelle mensualité 800 €, assurance fixe 20 €, frais 2 € + 3 € : intérêts combinés 22,15 €, deux échéances dont la dernière de 722,15 €. Économie nette globale 83,35 €. Remboursement seul : intérêts 30,10 €, quatre échéances (la troisième laisse 0,10 €) ; gain marginal après hausse 44,95 €.
4. Rembourser tout le capital : aucune échéance, aucun frais de hausse, aucun effort mensuel supplémentaire. Une ancienne valeur invalide de frais de hausse désactivée ne bloque pas la simulation.
5. Tester frais inconnus, frais élevés (surcoût), mensualité insuffisante, remboursement excessif, différé, reset et changements de champs.
6. Vérifier les cinq onglets sur téléphone et ordinateur ; le crédit enregistré doit rester inchangé.

Validation : `node tests/combined-simulation-regressions.cjs`, les cinq suites des scénarios antérieurs, TypeScript et compilation Next.js.
