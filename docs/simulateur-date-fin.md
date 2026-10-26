# Ekolocs — viser une date de fin

Accès : Crédits immobiliers → Simuler un remboursement → Viser une date de fin. Route : `/dashboard/credits/[id]/simuler/date-fin`.

## Objectif et fonctionnement

Choisir le mois auquel le crédit doit être soldé pour obtenir la mensualité nécessaire. Le capital est celui restant après l’échéance du mois de la situation de départ. La nouvelle mensualité commence le mois suivant, sans remboursement ponctuel initial.

La date de fin doit se situer entre le mois suivant la situation de départ et 600 mois après celle-ci. Le calcul recherche par dichotomie la plus petite mensualité au centime capable de solder le capital au plus tard au mois demandé. Chaque mensualité est évaluée avec les intérêts mensuels arrondis au centime, selon le même échéancier que les autres scénarios. La dernière échéance est ajustée au solde. Pour de très petits capitaux, les centimes peuvent conduire à une fin antérieure à la date limite : la fin simulée et un message l’indiquent.

La comparaison utilise le crédit actuel recalculé à partir du capital, du taux et de la mensualité saisis. La date de fin enregistrée est rappelée séparément ; si elle diffère, vérifier les paramètres avec l’échéancier bancaire.

## Saisie et résultats

- Situation au mois choisi (courant ou futur), capital, taux nominal annuel et mensualité actuelle modifiables pour cet essai.
- Date de fin souhaitée.
- Frais de modification facultatifs, réglés séparément : vide = inconnus, zéro = aucun frais.
- Assurance mensuelle fixe facultative, exclue par défaut.

Résultats : mensualité nécessaire hors assurance, effort supplémentaire ou baisse de mensualité, durée maximale visée, dates de fin et nombres d’échéances comparés, intérêts et assurance, économies ou surcoûts avant/après frais. Une date plus éloignée peut augmenter le coût : les valeurs négatives sont présentées comme des surcoûts, pas masquées. L’écart mensuel est hors assurance ; la cotisation fixe reste identique par mois. Deux échéanciers consultables, avec dernière mensualité ajustée.

## Hypothèses et protection

Prêt amortissable à taux fixe après tout différé enregistré. Pas d’intérêts journaliers, d’assurance variable, de fiscalité, de déblocages progressifs ni de rendement alternatif d’épargne. Les possibilités de modifier la durée et la mensualité, frais et conditions d’acceptation sont à vérifier auprès de la banque.

Aucune écriture en base, aucune modification du crédit réel, aucune migration SQL. Authentification et filtrage par propriétaire via le chargement commun aux autres simulations. Les trois fonctions de simulation existantes restent inchangées. Toute modification d’un champ invalide les résultats précédents. Réinitialiser restaure les paramètres enregistrés et efface l’objectif.

## Recette

1. Situation octobre 2026, capital 12 000 €, taux 0 %, mensualité actuelle 1 000 €, objectif juin 2027 : mensualité 1 500 €, huit échéances au lieu de douze, effort 500 €, quatre mois gagnés. Assurance fixe 30 € et frais 0 : économie 120 €.
2. Même situation, objectif mai 2027 : mensualité 1 714,29 €, dernière échéance 1 714,26 €, solde nul au mois visé.
3. Capital 1 000 €, taux annuel 12 %, mensualité actuelle 510 €, objectif décembre 2026 : mensualité minimale 507,51 €, intérêts totaux 15,02 €. Un centime de moins ne solde pas dans les deux mois ; un simple arrondi supérieur de la formule théorique donnerait un centime de trop.
4. Avec 12 000 € à 0 %, objectif octobre 2028, assurance fixe 30 € et frais 0 : mensualité 500 €, douze mois supplémentaires, surcoût assurance 360 €.
5. Date antérieure ou égale à la situation, au-delà de 600 mois, capital/taux/mensualité invalides : validation, aucun ancien résultat conservé.
6. Vérifier frais inconnus, assurance facultative, changement de date, réinitialisation et navigation entre les quatre onglets sur téléphone et ordinateur. Vérifier que le crédit enregistré reste inchangé.

Tests : `node tests/target-date-regressions.cjs`, suites des trois scénarios antérieurs, TypeScript et compilation Next.js. Les tests couvrent conservation du capital, échéancier au centime, date limite respectée et minimalité de la mensualité (un centime de moins manque l’objectif), jusqu’à 600 mois.
