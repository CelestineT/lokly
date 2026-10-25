# Ekolocs — quittance, progression des loyers et repère de valeur de marché

## Quittance

Libellé « Provision sur charges ». Pied de page : « un parc immobilier à destination de tous publics », puis « ekolocs.fr ». Cadre extérieur arrondi et blocs arrondis ; espacement entre les sections. Message sur toute la largeur avant le tableau pour garder les commentaires lisibles. Détail des charges sous le libellé, annexes, mode de paiement, informations bancaires et signature conservés.

Montants et règles de filigrane inchangés : total échéance, total payé, reste à payer, PAYÉ / PARTIELLEMENT PAYÉ / À PAYER. Tous les textes sont noirs sauf le logo bleu. Les lignes ne recalculent pas les montants transmis par le serveur. Les commentaires longs et annexes nombreuses déclenchent une pagination, avec références et pied de page répétés. Cas standard contrôlé visuellement sur A4 avec deux annexes : une page. Cas de stress : quatre pages, toutes les annexes présentes une seule fois. Vérification graphique avec Poppler et PyMuPDF (le rendu des fontes standards de Poppler dans cet environnement était défectueux ; PyMuPDF et l’extraction de caractères confirment les éléments).

Pour voir la nouvelle mise en page, générer/télécharger de nouveau le PDF. Un PDF déjà téléchargé ne change pas.

## Tableau de bord — progression des loyers

Graphique « Évolution des loyers HC », soumis aux filtres de période, bien et lot. Photographie des loyers mensuels hors charges et annexes facturées en fin de mois, ou au dernier jour sélectionné. Ce n’est ni un encaissement, ni un loyer proratisé, ni une mesure de l’IRL. Une variation peut provenir d’une révision, d’un changement de locataires ou de périmètre du parc.

Calculs via le même moteur de loyers que les autres vues : couples comptés une fois, révisions à date, annexes dédupliquées et bornées. Les archives datées conservées servent à reconstituer les anciens mois ; elles ne rentrent pas dans le loyer courant après la fin du bail. Les fiches supprimées ne sont pas inventées. Dates d’entrée manquantes : pas de graphique trompeur ; historique incomplet signalé. Pas de projection au-delà d’aujourd’hui, dix ans maximum par période. Montants accessibles dans un tableau dépliable et explications dans l’infobulle tactile/survol.

## Valeur de marché — source publique et valeur propriétaire

La demande porte sur la valeur de marché du bien, pas sur l’IRL. DVF publie des ventes passées : aucun montant produit ici n’est présenté comme une valeur officielle de marché.

Accès : Biens → Consulter → Performance de l’investissement → « Estimer avec les données DVF ». Déclenchement explicite : aucune adresse envoyée au chargement. Avant le clic, le bloc indique que l’adresse sera transmise au service de géocodage IGN, puis que les coordonnées serviront à interroger le Cerema. Aucun nom ou contact de propriétaire/locataire n’est transmis.

Sources publiques :
- Géocodage IGN : https://data.geopf.fr/geocodage/search
- API DVF+ ouverte documentée par le client officiel Cerema : https://apidf-preprod.cerema.fr/dvf_opendata/mutations
- Documentation : https://cerema.github.io/apifoncier/endpoints/dvf_opendata/
- Catalogue officiel : https://www.data.gouv.fr/dataservices/api-donnees-foncieres
- Présentation du service : https://www.economie.gouv.fr/particuliers/gerer-mon-argent/investir-dans-limmobilier/estimez-la-valeur-dun-bien-immobilier-avec-le-service-demande-de-valeurs-foncieres

Périmètre : appartements, studios et maisons avec adresse, code postal et surface habitable valides. Immeubles entiers, box, parkings et autres biens : évaluation spécifique, saisie manuelle conservée. Ne pas assimiler la somme de prix d’appartements à la valeur en bloc d’un immeuble.

Méthode indicative Ekolocs : ventes DVF de même type (111 maison / 121 appartement), même commune, secteur d’environ 1 km autour de l’adresse, surfaces à ±30 %, trois dernières années, hors VEFA et autres natures de mutation. Déduplication par mutation, contrôle des valeurs positives, retrait des valeurs extrêmes à 1,5 IQR. Au moins cinq ventes comparables après filtrage, et dernière vente depuis moins de 18 mois. Médiane des prix au m² × surface ; quartiles pour fourchette indicative ; arrondi au millier d’euros. Fourchette de dispersion des comparables, pas intervalle de confiance. État, travaux, DPE, étage, occupation et évolution conjoncturelle ne sont pas valorisés. Les prix peuvent englober des dépendances liées aux transactions comparables.

Chargement de toutes les pages du secteur retenu, au maximum 1 000 mutations ; refus d’une réponse tronquée ou incohérente. Les URL de pagination ne sont pas suivies : requêtes construites uniquement vers le domaine officiel. Délais de réponse bornés, erreurs explicites, ancienne valeur conservée en cas d’indisponibilité ou de données insuffisantes.

La suggestion est affichée avec source, fourchette, nombre de ventes, dates des ventes et date du calcul. « Reprendre cette estimation dans le formulaire » préremplit seulement les champs. Le propriétaire peut modifier montant et date puis doit enregistrer explicitement. La valeur existante n’est jamais remplacée par une nouvelle requête DVF. La valeur enregistrée alimente les indicateurs déjà existants (TRI et capital récupérable). Les dates futures ou invalides sont refusées côté serveur.

## Accès et vérifications

Lecture du bien authentifiée, filtrage explicite par propriétaire et identifiant avant tout appel externe. Aucune écriture de valeur par la recherche DVF. La saisie manuelle utilise l’action existante, filtrée par propriétaire. Aucun changement de schéma ni SQL requis.

Contrôles :
- `tests/quittance-layout-regressions.cjs` : libellés, cadre arrondi, pied de page, montants, trois statuts, couleur, pagination et annexes.
- `tests/rent-progression-regressions.cjs` : couples, révisions, archives, filtres, dates et données incomplètes.
- `tests/market-valuation-regressions.cjs` : calcul, données écartées, pagination, service indisponible, authentification, reprise manuelle et absence de requête avant clic.
- Suites existantes dashboard-scope, document-financing, rent-history, rental-coherence et vacancy-net-value : réussies.
- TypeScript et compilation Next.js : réussis.

L’accès public au catalogue et à des réponses DVF communales a été contrôlé. L’essai de géocodage en ligne à une adresse précise a été rejeté par le contrôle automatique d’autorisation, qui demandait une autorisation explicite de transmission à l’IGN. Cet essai n’a pas été poursuivi. Le parcours complet a été vérifié avec des réponses simulées, puis l’application a été adaptée pour ne transmettre l’adresse qu’après le clic explicite de l’utilisateur. La disponibilité et la fraîcheur de l’API restent dépendantes du service public.
