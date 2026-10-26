# Vérification de la vacance et du cash-flow

## Corrections vérifiées sur des cas reproductibles

1. **Période partielle d’un mois** : les graphiques du tableau de bord retenaient toutes les dépenses d’un mois, même celles avant/après les dates choisies, alors que le total les excluait. Les graphiques utilisent désormais les mêmes opérations que le total.
2. **Anciennes fiches sans bail correspondant** : le calcul de vacance fusionnait la première entrée et la dernière sortie des occupants partageant un ancien identifiant. Cela pouvait masquer un intervalle vide ou attribuer au même logement deux fiches appartenant à des lots différents. Chaque fiche fournit désormais son intervalle réel ; l’union des intervalles compte les couples une seule fois.
3. **Disponibilité propre à un lot** : le tableau de bord et la synthèse Biens ne chargeaient pas cette donnée éventuelle. Les données complètes des lots sont désormais transmises au calcul, comme dans Rentabilité.
4. **Volumétrie** : les paiements, dépenses et quittances du tableau de bord sont désormais chargés sur toutes les pages Supabase, au lieu de dépendre de la première page retournée.
5. **Saisie initiale** : la date de mise en location peut désormais être saisie dès la création du bien, comme à sa modification. La colonne et son enregistrement existaient déjà ; aucun SQL supplémentaire n’est requis.

## Règles conservées

- Vacance = jours-logements disponibles sans occupation / jours-logements disponibles × 100. Ce n’est pas la proportion de logements actuellement vides.
- Le début de disponibilité est la date de mise en location du lot si elle existe, sinon celle du bien. L’acquisition ne remplace pas automatiquement une disponibilité inconnue.
- Entrée et sortie sont des jours occupés. Les jours sont comptés en UTC pour éviter les effets des changements d’heure. Le calcul s’arrête au plus tard aujourd’hui.
- Les logements sont comptés séparément ; les annexes sont exclues. Un impayé ne rend pas le logement vacant.
- Les dates manquantes, baux non rattachés et historiques incomplets rendent le taux indisponible avec une explication. Aucune occupation n’est inventée et aucun historique n’est restauré.
- Cash-flow = paiements reçus/partiels à leur date de réception − dépenses à leur date enregistrée − estimation des mensualités de crédit et assurance sur les mois concernés, différés compris.
- Le crédit reste une estimation mensuelle : un mois couvert partiellement compte une mensualité entière selon la règle existante. Aucun jour réel de prélèvement ni remboursement bancaire n’est déduit des données disponibles.
- Les loyers attendus, soldes dus, quittances et dépôts de garantie encaissés séparément ne sont pas ajoutés comme recettes de loyers. Les montants de charges/annexes déjà compris dans les paiements ne sont pas ajoutés une seconde fois.
- Une dépense récurrente enregistrée reste une opération datée : le cash-flow ne génère pas automatiquement des prélèvements futurs.
- En mode lot, le cash-flow reste indisponible, car les dépenses et crédits du bien ne sont pas ventilés arbitrairement entre ses lots.

## Contrôle dans l’application

Dans Tableau de bord, choisir le bien et les dates puis ouvrir **Vérifier le taux de vacance** et **Vérifier le cash-flow**. Comparer les jours, encaissements, dépenses et crédits avec les opérations saisies. Pour comparer avec Rentabilité, utiliser la même période, du 1er janvier à aujourd’hui, et le même bien.

Exemple vérifié : un logement disponible du 1er au 31 mars, occupé du 1er au 10 puis du 20 au 31, a 9 jours vacants sur 31, soit environ 29,03 %. Un couple sur le même bail ne double pas les jours occupés.

Les corrections ne modifient aucune donnée locative, paiement, dépense ou financement. L’audit du code et les tests ne constituent pas une vérification des données privées réelles de Reims/Arcueil. Un exemple observé avec bien, période, résultat affiché et résultat attendu reste nécessaire pour confirmer un éventuel écart supplémentaire.

## Tests

- `node tests/vacancy-cash-audit-regressions.cjs`
- `node tests/vacancy-net-value-regressions.cjs`
- `node tests/dashboard-scope-regressions.cjs`
- `node tests/property-performance-regressions.cjs`
- `node tests/rental-coherence-regressions.cjs`
- `node tests/deferral-order-regressions.cjs`

Ces tests couvrent les périodes partielles, cohérence total/graphiques, paiements partiels/datés, centimes, différés, assurance, vacance pondérée, intervalles vides, couples, anciens baux, périmètres et absence de mutation.
