# Ekolocs — renégocier le taux du crédit

Septième et dernier scénario de la liste prévue. Accès : Crédits immobiliers → Simuler un remboursement → Renégocier le taux. Route : `/dashboard/credits/[id]/simuler/renegocier-taux`.

## Objectif et périmètre

Comparer le crédit actuel à une baisse du taux nominal annuel fixe, sans changement du capital, à partir de la prochaine échéance. Deux options : garder la mensualité pour finir plus tôt, ou recalculer une mensualité permettant de finir au plus tard à la date calculée du crédit actuel. La seconde option utilise la mensualité minimale au centime selon les intérêts arrondis mensuellement ; la fin peut être légèrement antérieure en raison des centimes. La dernière échéance est ajustée au solde.

Il s’agit d’une renégociation à capital et assurance inchangés. Un rachat avec nouveau capital, frais financés ou assurance différente n’est pas modélisé. Taux, frais et conditions d’acceptation restent à confirmer avec la banque.

## Paramètres

Situation après l’échéance du mois choisi (courant ou futur), capital estimé remplaçable par le capital bancaire, taux nominal annuel et mensualité actuels, nouveau taux nominal strictement inférieur. Taux compris entre 0 et 100 %, six décimales maximum. Un nouveau taux de zéro est accepté si le taux actuel est positif ; un crédit déjà à zéro ne peut pas bénéficier de cette simulation de baisse.

Frais totaux de renégociation facultatifs, comptés une seule fois dans chaque scénario alternatif et payés séparément, sans ajout au capital. Champ vide = inconnus, zéro = aucun frais. Assurance à cotisation mensuelle fixe facultative, exclue par défaut, même cotisation dans les trois scénarios.

## Lecture des résultats

Capital inchangé et taux actuel/nouveau, trois échéanciers avec mensualité, durée, date de fin, intérêts et assurance restants, frais et dernière échéance. Les deux options affichent les mois gagnés, la baisse de charge mensuelle et les économies de coût financier après frais, avant fiscalité. Les pertes sont affichées en surcoût. De très faibles baisses de taux combinées à une mensualité recalculée peuvent aussi entraîner quelques centimes d’intérêts supplémentaires à cause des arrondis ; ils restent visibles.

Les frais inconnus ne sont pas assimilés à zéro. Les frais déjà payés dans le passé ne sont pas repris ; seule la comparaison du coût futur est calculée. Le capital est remboursé intégralement dans tous les scénarios et ne constitue pas une économie. La date enregistrée du crédit est rappelée séparément pour aider à rapprocher le scénario actuel du tableau d’amortissement bancaire.

## Hypothèses et protection

Prêt amortissable à taux fixe, après tout différé enregistré, calcul mensuel au centime, maximum 600 échéances. Ni intérêts journaliers, déblocages progressifs, assurance variable ni fiscalité. Les économies d’assurance fixe correspondent uniquement aux échéances évitées.

Aucune écriture en base, aucune modification du contrat enregistré, aucune migration SQL. Chargement authentifié et filtré par propriétaire réutilisé. Fonctions des six scénarios précédents inchangées. Les résultats sont invalidés à chaque changement de champ ; reset disponible.

## Recette

1. Situation octobre 2026, capital 1 000 €, taux actuel 12 %, mensualité 510 €, nouveau taux 6 %, frais 2 €, assurance fixe 20 € : intérêts actuels 15 €. Avec mensualité conservée : deux échéances, intérêts 7,48 €, dernière échéance 497,48 €, gain net 5,52 €. Avec durée comparable : mensualité 503,76 €, dernière 503,75 €, intérêts 7,51 €, gain net 5,49 € et baisse mensuelle 6,24 €.
2. Avec capital 2 000 € et les mêmes autres paramètres : crédit actuel de cinq mois avec 50,50 € d’intérêts ; mensualité conservée après baisse du taux : quatre mois, intérêts 24,95 €, dernière échéance 494,95 €, gain net 43,55 € (intérêts évités 25,55 € + assurance évitée 20 € - frais 2 €).
3. Nouveau taux 0 %, capital 1 000 € : mensualité conservée 510 €, dernière 490 €, ou mensualité recalculée 500 € sur deux mois. Intérêts futurs nuls.
4. Frais vides : gain net à préciser. Frais 100 € dans le cas 1 : pertes de 92,48 € / 92,51 €, affichées en surcoût.
5. Nouveau taux égal/supérieur au taux actuel, négatif, trop de décimales, capital/mensualité invalides, mois antérieur et différé : validation, aucun résultat périmé.
6. Vérifier les sept onglets et les échéanciers sur mobile/ordinateur, reset et absence de changement sur le crédit enregistré.

Validation automatisée : `node tests/rate-renegotiation-regressions.cjs`, suites des six scénarios précédents, TypeScript et compilation Next.js. Tests de conservation du capital, dates, intérêts exacts, mensualité minimale, frais non doublés, assurance et navigation.
