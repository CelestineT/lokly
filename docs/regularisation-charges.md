# Régularisation des charges sur les nouvelles quittances

Dans Quittances > Nouvelle quittance : montant facultatif signé et période (texte de 120 caractères au maximum, obligatoire si le montant est non nul). Un complément est positif, une déduction est négative. La provision mensuelle du bail reste inchangée.

Le montant du mois est calculé à partir des loyers, provisions et annexes historiques du bail, puis de la régularisation. Le solde antérieur reste séparé et informatif selon le fonctionnement existant. Le serveur refuse une quittance si les encaissements du mois sont inférieurs au montant du mois après régularisation. Une déduction dépassant ce montant est refusée : cette interface ne représente pas un remboursement autonome. Les valeurs monétaires sont arrondies au centime. Le montant et la période sont conservés après redirection vers le formulaire de paiement et retour à la quittance.

La régularisation est enregistrée sur la quittance, présentée dans sa consultation et transmise aux deux générateurs de PDF (téléchargement et signature/envoi). La période apparaît sous la ligne dédiée. Elle ne crée pas une recette supplémentaire et n’altère pas les montants du bail. Les anciens documents ne sont pas recalculés.

## Mise en service

Exécuter une fois dans le SQL Editor Supabase du projet de recette : `supabase/migrations/20261025_regularisation_charges.sql`. Il ajoute deux colonnes sans effacer de données. Il est réexécutable. Aucun accès direct à Supabase n’a été utilisé ici ; son exécution réelle reste à effectuer par l’administratrice. Avant migration, les anciennes quittances et la création sans régularisation continuent de fonctionner ; une création avec régularisation affiche une erreur explicite sans réessayer un enregistrement tronqué.

La migration devra également être appliquée à toute base de production distincte avant utilisation du champ.

## Vérifications

Test dédié : +120 sur 595 => 715 requis ; -80 => 515 requis ; solde antérieur distinct ; montant nul/absent ; décimales et période invalides ; déduction excessive ; absence de colonnes ; droits propriétaire ; montant/période dans le PDF positif et négatif ; réinitialisation du champ sur un autre bail ; conservation du brouillon dans le lien de retour du paiement. Contrôle visuel des deux PDF fictifs. Tests existants paiement, historique des loyers, retrait d’annexes, documents/financement et mise en page PDF ; TypeScript et build Next.js.
