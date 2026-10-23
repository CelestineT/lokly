# Simulateur Ekolocs : augmenter la mensualité

Accès : Crédits immobiliers → Simuler un remboursement → Augmenter la mensualité.

Le deuxième onglet compare le crédit actuel à une hausse permanente de mensualité, sans remboursement ponctuel initial. Il est également accessible à `/dashboard/credits/[id]/simuler/mensualite`.

## Saisie et résultats

- Situation après l’échéance du mois choisi (mois courant ou futur).
- Capital restant dû estimé, remplaçable par le capital bancaire ; taux et mensualité actuelle ajustables pour la simulation.
- Nouvelle mensualité hors assurance, strictement supérieure à la mensualité actuelle.
- Frais de modulation facultatifs : vide signifie inconnus, zéro signifie aucun frais.
- Assurance fixe mensuelle facultative, exclue par défaut.

La première échéance augmentée intervient le mois suivant la situation choisie. La hausse reste constante jusqu’au remboursement complet. Comparaison : mensualités, nombre d’échéances, fin estimée, intérêts et assurance restants, dernière échéance ajustée. Affichage des mois gagnés, intérêts et assurance économisés, effort mensuel supplémentaire et économies avant/après frais. Les échéanciers des deux scénarios sont consultables.

Le capital n’est pas diminué au début du scénario. L’effort supplémentaire n’est pas présenté comme une économie. Une économie après frais négative reste affichée. Les frais sont réglés séparément, sans capitalisation. L’assurance fixe reste identique par mois ; son économie dépend des échéances évitées. La fin calculée peut différer de la date enregistrée : vérifier les paramètres avec l’échéancier bancaire.

## Périmètre et protection

Prêt amortissable à taux fixe, calcul mensuel au centime, après tout différé enregistré. Maximum 600 échéances, taux de 0 à 100 %, montants jusqu’à 100 millions d’euros. Pas de fiscalité, d’assurance variable, de déblocages progressifs ni d’intérêts journaliers. Les conditions contractuelles de modulation (accord, plafonds, délai et frais) restent à vérifier auprès de la banque.

Aucune écriture en base, aucun changement au crédit réel, aucune migration SQL. Chargement authentifié et filtré par propriétaire via le même helper que le premier scénario. Changer un champ invalide la comparaison précédente. Réinitialiser restaure les paramètres enregistrés.

## Recette

1. Ouvrir un crédit depuis la liste, puis l’onglet Augmenter la mensualité.
2. Pour une situation de 12 000 € à 0 %, mensualité actuelle 1 000 €, nouvelle mensualité 1 500 €, frais 0 : vérifier 12 contre 8 mois, soit 4 mois gagnés et 500 € d’effort mensuel. Avec assurance fixe 30 €, économie de 120 € ; sans assurance, intérêts économisés 0 €.
3. Saisir une mensualité égale ou inférieure à l’actuelle : message de validation et aucun résultat périmé.
4. Effacer les frais : économies après frais à préciser. Mettre des frais élevés : perte éventuelle conservée.
5. Changer un champ, vérifier que les anciens résultats disparaissent ; réinitialiser.
6. Vérifier les deux onglets sur mobile et ordinateur, puis rouvrir le crédit enregistré : ses données doivent être inchangées.

Validation automatisée : `tests/payment-increase-regressions.cjs`, `tests/prepayment-regressions.cjs` et `tests/prepayment-ui-regressions.cjs`, TypeScript et compilation Next.js.
