# Différé de crédit et classement des vignettes

## Mise en service

Le code est déployé par Vercel. Le SQL ne déclenche pas un déploiement Vercel : il active les champs en base. Après le déploiement et l'exécution de `supabase/migrations/20261017_differe_ordre_affichage.sql` dans la même base que la recette, actualiser l'application.

Cette nouvelle migration complète `20261017_suivi_paiements_financements.sql` ; elle ne la remplace pas et ne supprime aucune donnée.

## Crédit

- « Ajouter un élément à financer » remplace « Ajouter un poste ».
- Différé : aucun, partiel ou total, avec dates et mensualité hors assurance saisie explicitement, y compris 0 €.
- La période est inclusive et limitée à 36 mois (01/01/2026–31/12/2028 accepté, 01/01/2026–01/01/2029 refusé).
- Les dates du différé sont comprises dans les dates du crédit ; la date de début du crédit est obligatoire pour un différé.
- L'assurance est ajoutée séparément. La durée et la date de fin contractuelles sont saisies différé compris et ne sont pas prolongées automatiquement.
- Cash-flow : la mensualité de différé remplace la normale durant les mois couverts, puis la normale reprend. Convention mensuelle : tout mois touchant la période est traité comme un mois de différé, sans prorata journalier.
- Capital estimé : pas d'amortissement pendant un différé partiel ; en différé total, intérêts nominaux mensuels capitalisés, diminués de la mensualité éventuelle hors assurance saisie. Les calculs ne reconstituent pas les déblocages de fonds et frais bancaires.
- Le tableau de bord, les cartes des biens, leur détail, les crédits, la rentabilité et le TRI prennent en compte le différé. Les crédits sans différé conservent leurs calculs antérieurs.

## Vignettes

- Bouton « Réorganiser », puis flèches ↑/↓ et « Enregistrer l’ordre ».
- Classement stocké dans le profil connecté, réutilisé à la prochaine connexion ; pas de stockage limité au téléphone.
- Les immeubles peuvent être déplacés et les locataires classés à l'intérieur de chaque immeuble. Actifs et historique restent séparés.
- Les nouveaux éléments sont ajoutés après les éléments classés ; les identifiants supprimés sont ignorés.
- « Ordre initial » propose le classement de départ ; enregistrer pour le conserver. « Annuler » abandonne les changements non sauvegardés.
- Dans Biens, Consulter / Modifier / Supprimer sont groupés à droite de chaque carte.

## Vérifications

```sh
node tests/deferral-order-regressions.cjs
node tests/ordered-cards-ui.cjs
node tests/payment-regressions.cjs
node tests/document-financing-regressions.cjs
npx tsc --noEmit
npm run build
```

Le SQL doit être appliqué avant de pouvoir enregistrer un différé ou un classement. Sans migration, les fiches existantes restent consultables et les fonctions nouvelles expliquent la mise à jour requise.
