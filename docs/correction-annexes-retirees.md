# Annexes retirées : correction ciblée

Le calcul choisit désormais la dernière version applicable du rattachement avant de tester sa date de fin. Une ancienne version ouverte ne doit pas ressusciter après la clôture d’une version plus récente. Les formulaires Paiement et Quittance partagent ce calcul et isolent les chargements par bail, bien et mois. Un chargement incomplet ou en erreur empêche la validation. Le paiement relit les rattachements avant insertion ; la quittance les recalcule côté serveur.

Le détail repliable des rattachements affiche les dates enregistrées et explique la présence ou l’absence dans le mois. La fiche locataire conserve l’historique des retraits.

Aucune donnée historique ni quittance existante n’est supprimée ou réécrite. Aucune migration SQL. La règle de chevauchement mensuel est conservée, sans invention de prorata.

Le cas réel de Jasmina nécessite de lire la date de retrait enregistrée. Les tests utilisent des données fictives : loyer 470 €, charges 50 €, garage 75 €, box retiré le 30 septembre => octobre 595 €. Un retrait pendant octobre conserve le box dans octobre selon la règle existante. Ces résultats ne constituent pas une vérification de ses données réelles.

Validation : test dédié retrait/version clôturée, changement rapide de bail/mois, chargement en erreur, recontrôle avant paiement, création serveur de quittance ; tests existants paiement, historique des loyers, cohérence des vues, consultation locataire, périmètres du tableau de bord, progression des loyers et documents/financement ; TypeScript et compilation Next.js.
