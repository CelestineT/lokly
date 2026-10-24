# Ekolocs — réduire la mensualité

Accès : Crédits immobiliers → Simuler un remboursement → Réduire la mensualité. Route : `/dashboard/credits/[id]/simuler/reduire-mensualite`.

## Objectif

Comparer la mensualité actuelle à une mensualité plus faible, sans remboursement ponctuel préalable. Afficher le budget mensuel libéré, la nouvelle date de fin, l’allongement et le surcoût financier. Ce scénario complète la baisse de mensualité après remboursement ponctuel, déjà couverte par le premier onglet.

## Saisie et calendrier

Situation après l’échéance du mois choisi (courant ou futur), capital restant dû estimé et modifiable selon l’échéancier bancaire, taux nominal et mensualité actuelle. La nouvelle mensualité doit être strictement positive et inférieure à l’actuelle. Elle s’applique dès le mois suivant, de façon constante jusqu’à extinction du crédit. Aucun capital n’est remboursé au départ ; la dernière échéance est ajustée au solde.

Frais de modulation facultatifs, payés séparément : vide signifie inconnus, zéro aucun frais. Assurance à cotisation fixe facultative et exclue par défaut.

## Résultats

Comparaison des deux échéanciers : mensualités hors assurance, nombre d’échéances restantes, fin estimée, intérêts et assurance restants, dernière échéance ajustée. Synthèse de la baisse de charge mensuelle hors assurance, des mois supplémentaires, des intérêts et de l’assurance supplémentaires, des frais, et du surcoût avant et après frais. Le surcoût total reste inconnu tant que les frais ne sont pas renseignés.

Le budget mensuel libéré n’est pas présenté comme une économie sur le coût total. L’assurance fixe reste identique par mois et augmente son coût cumulé sur les mois supplémentaires. Le capital remboursé est identique dans les deux scénarios. Le rappel de la date de fin enregistrée permet de vérifier si le scénario actuel recalculé correspond à l’échéancier bancaire.

## Validation et limites

Mensualités qui ne couvrent pas les intérêts, prêt non amortissable ou remboursement au-delà de 600 mois : rejet avec message explicatif, sans résultat périmé. La limite du simulateur est de 50 ans ; la durée maximale et l’allongement autorisés par le contrat peuvent être inférieurs. Les conditions de modulation et frais restent à vérifier auprès de la banque.

Prêt amortissable à taux fixe après tout différé enregistré, calcul mensuel au centime. Ni intérêts journaliers, assurance variable, fiscalité ni déblocages progressifs.

Aucune écriture en base, aucun changement au crédit enregistré, aucune migration SQL. Chargement authentifié et filtré par propriétaire réutilisé. Fonctions des cinq scénarios antérieurs inchangées. Changer un champ invalide les résultats ; réinitialisation disponible.

## Recette

1. Situation octobre 2026, capital 12 000 €, taux 0 %, mensualité actuelle 1 000 €, nouvelle mensualité 500 € : 12 mois contre 24, fin octobre 2028, baisse mensuelle de 500 €, douze mois supplémentaires. Avec assurance fixe 30 € et frais 20 €, surcoût 360 € d’assurance + 20 € de frais = 380 €.
2. Capital 1 000 €, taux annuel 12 %, mensualité actuelle 510 €, nouvelle 340,03 € : trois échéances au lieu de deux ; dernière échéance 340,01 €. Intérêts 20,07 € au lieu de 15 €. Avec assurance fixe 20 € et frais 2 €, surcoût 27,07 €.
3. Frais vides : surcoût après frais « Frais à préciser ». Sans assurance et sans frais, le cas à 0 % affiche un surcoût de zéro.
4. Mensualité égale/supérieure à l’actuelle, zéro, intérêts non couverts, durée excessive : validation sans anciens résultats conservés. Durée exactement 600 mois acceptée.
5. Tester différé, changement de mois, reset, navigation entre les six onglets et consultation des échéanciers sur téléphone et ordinateur. Les données du crédit réel doivent rester inchangées.

Tests : `node tests/payment-reduction-regressions.cjs`, suites des cinq scénarios existants, TypeScript et compilation Next.js. Vérifications au centime, conservation du capital et arrêt au solde nul sur plusieurs taux, capitaux et niveaux de baisse.
