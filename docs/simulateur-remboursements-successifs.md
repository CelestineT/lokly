# Ekolocs — remboursements anticipés successifs

Troisième cas d’usage : « Si je rembourse 5 000 € chaque année, quand mon crédit sera-t-il soldé ? »

Accès : Crédits immobiliers → Simuler un remboursement → Remboursements successifs. Route : `/dashboard/credits/[id]/simuler/successifs`.

## Paramètres

Situation après l’échéance du mois choisi, capital restant dû estimé (modifiable selon l’échéancier bancaire), taux fixe et mensualité habituelle. Choisir un montant supplémentaire, un premier mois strictement postérieur à la situation, et une fréquence : mensuelle, trimestrielle, semestrielle ou annuelle (par défaut). La première date proposée est un an après la situation choisie.

Frais facultatifs par versement : hypothèse d’un montant fixe payé séparément pour chaque opération effectivement exécutée. Champ vide = inconnu, zéro = aucun frais. L’hypothèse s’applique aussi au dernier versement réduit : vérifier son adéquation avec la banque, les indemnités pouvant varier selon l’opération. Assurance fixe facultative, exclue par défaut.

## Calcul et lecture

Chaque mois : calcul des intérêts sur le capital d’ouverture, échéance habituelle, puis versement supplémentaire si prévu. Le dernier versement supplémentaire est plafonné au capital encore dû. Arrêt automatique des versements et des frais à l’extinction du crédit. Si le crédit est déjà soldé avant la première date (ou par l’échéance habituelle de ce mois), aucune opération supplémentaire ni aucun frais n’est retenu ; un message l’explique.

La mensualité habituelle est conservée, la durée diminue. Comparaison des dates de fin, échéances restantes, intérêts, assurance fixe et dernière échéance habituelle. Résultats : nombre et calendrier des versements réellement nécessaires, capital anticipé cumulé, frais cumulés, trésorerie supplémentaire cumulée, mois gagnés, économies avant et après frais. La trésorerie supplémentaire est à répartir aux dates prévues, pas à mobiliser intégralement au départ. Le capital remboursé ne constitue pas une économie ; seuls les intérêts et l’assurance évités, diminués des frais connus, le sont. Les économies négatives ne sont pas masquées. Échéanciers mensuels avec intérêts, capital, versements supplémentaires, frais et capital restant.

## Périmètre et non-régression

Aucune écriture en base, aucun changement au crédit réel, aucune migration SQL. Chargement authentifié et filtré par propriétaire, partagé avec les deux premiers scénarios. Les fonctions des deux premiers scénarios sont inchangées. Les résultats disparaissent dès qu’un paramètre change ; réinitialisation disponible.

Calcul au centime, prêt amortissable à taux fixe, après les différés enregistrés. Maximum 600 échéances. Ni intérêts journaliers, assurance variable, fiscalité, déblocages progressifs, ni rendement alternatif de l’épargne. Les montants minimums autorisés, frais, indemnités et modalités d’acceptation restent ceux du contrat bancaire.

## Recette

- Situation octobre 2026, capital 30 000 €, taux 0 %, mensualité 1 000 €, versement supplémentaire 5 000 € chaque année à partir d’octobre 2027, frais 0 : fin initiale avril 2029 (30 mois), fin simulée octobre 2028 (24 mois), deux versements de 5 000 € puis 1 000 €. Capital anticipé 6 000 €, six mois gagnés. Avec assurance fixe 30 €, économie de 180 €.
- Mettre un versement supérieur au capital : il doit être plafonné, aucun remboursement négatif ni opération après extinction.
- Mettre la première date après la fin du crédit : aucun versement ni frais, message explicatif.
- Frais vides : estimation après frais inconnue ; frais élevés : perte éventuelle affichée.
- Tester chaque fréquence, changer la situation et vérifier la date proposée, réinitialiser.
- Vérifier les trois onglets sur téléphone et ordinateur et contrôler que le crédit enregistré reste inchangé.

Tests : `node tests/successive-prepayment-regressions.cjs`, les trois suites des scénarios précédents, `tsc --noEmit` et compilation Next.js.
