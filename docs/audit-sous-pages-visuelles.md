# Vérification visuelle des sous-pages Ekolocs

Inventaire : 28 routes secondaires. Revue de leurs sources et de leurs composants délégués.

Les nouveaux écrans harmonisés partagent `FormHeader`, `FormSection` et `form-pages.css`. Les écrans déjà refondus conservent leur feuille métier. Aucun schéma SQL ni calcul métier modifié.

## Vérification en navigateur avec données fictives

11 vues testées à 320, 390, 768 et 1440 pixels : création de bien, modification d’appartement, modification d’immeuble avec lots, ajout de lot, création de locataire, modification d’occupant, modification de bail, ajout d’occupant, sélection de financement, document/quittance ancien parcours et nouvelle dépense. Contrôles : absence de débordement horizontal, absence d’erreur JavaScript, sections et actions visibles. Les états conditionnels de type de bien, Autre, lots, révision/correction de loyer et clôture du bail sont également ouverts sans enregistrer de données.

Les tests utilisent des services simulés. Ils ne constituent pas une visite authentifiée de chacun des comptes réels ni un test d’envoi de document.

## Routes inventoriées

| Route | Présentation |
|---|---|
| `/dashboard/biens/[id]/financement` | Plan de financement et formulaire dédié |
| `/dashboard/biens/[id]/lots/nouveau` | Formulaire harmonisé : en-tête à icône, cartes et actions |
| `/dashboard/biens/[id]/modifier` | Formulaire harmonisé : en-tête à icône, cartes et actions |
| `/dashboard/biens/[id]` | Fiche de bien détaillée |
| `/dashboard/biens/nouveau` | Formulaire harmonisé : en-tête à icône, cartes et actions |
| `/dashboard/credits/[id]/simuler/combine` | Simulateur : en-tête, navigation et cartes de calcul |
| `/dashboard/credits/[id]/simuler/date-fin` | Simulateur : en-tête, navigation et cartes de calcul |
| `/dashboard/credits/[id]/simuler/mensualite` | Simulateur : en-tête, navigation et cartes de calcul |
| `/dashboard/credits/[id]/simuler` | Simulateur : en-tête, navigation et cartes de calcul |
| `/dashboard/credits/[id]/simuler/reduire-mensualite` | Simulateur : en-tête, navigation et cartes de calcul |
| `/dashboard/credits/[id]/simuler/renegocier-taux` | Simulateur : en-tête, navigation et cartes de calcul |
| `/dashboard/credits/[id]/simuler/successifs` | Simulateur : en-tête, navigation et cartes de calcul |
| `/dashboard/credits/nouveau` | Formulaire harmonisé : en-tête à icône, cartes et actions |
| `/dashboard/depenses/[id]/modifier` | Dépenses : formulaire partagé et fiche détaillée |
| `/dashboard/depenses/[id]` | Dépenses : formulaire partagé et fiche détaillée |
| `/dashboard/depenses/nouvelle` | Dépenses : formulaire partagé et fiche détaillée |
| `/dashboard/fiscalite/[id]` | Vue fiscale détaillée |
| `/dashboard/locataires/[id]/ajouter-occupant` | Formulaire harmonisé : en-tête à icône, cartes et actions |
| `/dashboard/locataires/[id]/modifier` | Formulaire harmonisé : en-tête à icône, cartes et actions |
| `/dashboard/locataires/[id]/modifier-bail` | Formulaire harmonisé : en-tête à icône, cartes et actions |
| `/dashboard/locataires/[id]` | Fiche de locataire détaillée |
| `/dashboard/locataires/nouveau` | Formulaire harmonisé : en-tête à icône, cartes et actions |
| `/dashboard/paiements/nouveau` | Formulaire commun de paiement et quittance |
| `/dashboard/quittances/[id]` | Fiche de quittance et actions de document |
| `/dashboard/quittances/nouvelle` | Formulaire commun de paiement et quittance |
| `/dashboard/rentabilite/[id]` | Indicateurs détaillés |
| `/dashboard/signatures/[id]` | Document : nouvel en-tête, synthèse et actions |
| `/dashboard/signatures/nouveau` | Ajout de document et aperçu commun |

Les panneaux internes de Paramètres et Mon compte, la fenêtre d’aperçu des documents et les états de simulation ne sont pas des routes supplémentaires ; ils utilisent les styles de leur rubrique.
