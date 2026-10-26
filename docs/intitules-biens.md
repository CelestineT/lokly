# Nom du bien et intitulé personnalisé

Le nom du bien (`biens.nom`) et son intitulé complémentaire (`biens.nom_personnalise`) sont deux champs distincts. Ils sont proposés, dans cet ordre, pour tous les types de biens : appartement, maison, studio, immeuble, immeuble de rapport, parking, box, garage, cave, local commercial et autre.

Les noms existants restent à leur emplacement actuel. Aucun nom n’est renommé, déplacé ou copié automatiquement. Les intitulés des lots d’un immeuble restent dans `lots.nom_personnalise`, indépendamment du nouvel intitulé du bien.

## Activation

Exécuter `supabase/migrations/20261026_intitule_personnalise_biens.sql` dans le SQL Editor de la base de recette. La migration est rejouable ; elle ajoute une colonne facultative et ne modifie aucune donnée existante.

Puis ouvrir **Biens → Modifier** :

- **Nom du bien** : nom actuel conservé, par exemple « Arcueil ».
- **Intitulé personnalisé du bien** : complément facultatif, par exemple « T2 Jardin ».

Enregistrer, consulter le bien et vérifier sa carte. L’intitulé peut être modifié ou effacé sans changer le nom du bien. Il est limité à 120 caractères.

## Vues concernées

| Vue | Présentation |
| --- | --- |
| Création/modification d’un bien | Nom puis intitulé dans deux champs distincts, quel que soit le type |
| Carte et consultation d’un bien | Nom puis intitulé sur la ligne suivante, avant l’adresse |
| Carte d’un locataire sans lot | Nom du bien puis intitulé du bien occupé |
| Consultation d’un locataire | Nom et intitulé complémentaire du bien, lot occupé conservé s’il existe |
| Nouveau locataire | Nom et intitulé dans le choix du bien |
| Création/modification d’un paiement ou d’une quittance | Intitulé du lot en priorité ; sinon nom et intitulé du bien, avec la ville |
| Listes des paiements et quittances | Nom et intitulé complémentaire du bien |
| Aperçu, téléchargement et signature d’une quittance | Nom du bien dans son bloc ; intitulé du lot ou, sans lot, intitulé du bien dans « Logement occupé » |

Les anciens biens sans intitulé conservent l’affichage de leur nom. Les anciens formulaires n’effacent pas le nouvel intitulé. Avant activation SQL, un intitulé vide n’empêche pas les saisies existantes ; une tentative de renseigner le nouveau champ indique la migration nécessaire.

## Validation

`PGLITE_MODULE=/chemin/vers/@electric-sql/pglite node tests/property-names-regressions.cjs` vérifie les onze types, les deux champs distincts, l’ajout/la modification/l’effacement, la compatibilité avec les anciens formulaires, le contrôle propriétaire et la migration additive rejouable.

`node tests/receipt-preview-prorata-regressions.cjs` vérifie la reprise cohérente de l’intitulé dans les PDF de consultation et signature, ainsi que le repli vers le nom existant.
