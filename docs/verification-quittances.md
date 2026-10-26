# Vérification des quittances par QR code

## Activation
Exécuter `supabase/migrations/20261026_verification_quittances.sql` dans le SQL Editor Supabase du même environnement que l'application. Le script ne modifie ni les loyers ni les paiements. Il crée une table privée, deux fonctions RPC et un déclencheur sur les quittances. Aucune clé administrateur supplémentaire n'est requise. Tant que la fonction SQL n'existe pas, les PDF habituels continuent à fonctionner sans QR code. Dès que la migration est exécutée, la vérification s'active automatiquement à la prochaine génération. Les autres erreurs d'enregistrement bloquent le nouveau PDF avec une erreur 503 : aucun QR code non fonctionnel n'est émis.

En recette, les QR pointent vers `https://lokly-git-fix-v3-9-lot-principal-lockly1.vercel.app/verifier#<code>`.
Avant la production, définir `QUITTANCE_VERIFICATION_ORIGIN` dans Vercel sur le domaine HTTPS durable de **l'application**, puis redéployer. Le site vitrine n'a pas besoin de cette page. Conserver accessibles les domaines des anciens QR si l'adresse change. Ne pas importer de versions de test dans la production.

## Fonctionnement
Le même service est appelé par l'aperçu/téléchargement et par l'envoi signé. Il enregistre atomiquement une version avant de produire le PDF, en vérifiant le propriétaire connecté et que la quittance n'a pas changé pendant le chargement. Deux ouvertures simultanées de données identiques réutilisent la même référence. Une correction de la quittance marque la version précédente comme remplacée ; les modifications de ses données liées produisent une nouvelle version lors de la génération suivante. Un simple changement du statut d'envoi ne remplace pas la version.

La version conserve un instantané privé des données utilisées pour le PDF, dont les coordonnées/signature du bailleur. L'empreinte SHA-256 du contenu sert à identifier ces versions ; ce n'est pas une signature numérique avec certificat et elle n'est pas affichée comme telle. Les données publiques sont limitées à la référence, période, date de signature, montants, date d'émission et statut. Aucun accès public au PDF complet, IBAN, signature manuscrite, identité, adresse, téléphone ou commentaire. Aucun annuaire ni recherche publique par nom ou numéro séquentiel.

Le code aléatoire de 64 caractères hexadécimaux est dans le fragment du lien, jamais dans la requête initiale du navigateur ; la page l'envoie par POST. Toute personne détenant ce lien peut consulter ces montants. Ne pas ajouter d'analytics/session replay à cette page. La page est hors connexion propriétaire, sans indexation, sans cache API et sans transmission du referrer.

La suppression d'une quittance efface ses instantanés privés et montants publics ; seule subsiste une référence d'annulation permettant d'informer le détenteur de l'ancien QR. La suppression du compte supprime aussi ces versions. Les anciennes versions remplacées sont conservées tant que la quittance existe, pour contrôler les documents émis.

## Contrôle utilisateur après activation
1. Ouvrir l'aperçu, scanner le QR avec un téléphone non connecté : comparer référence complète, période, date, échéance, payé et impayé.
2. Télécharger puis rouvrir les mêmes données : référence identique.
3. Modifier la quittance et l'enregistrer : l'ancien QR indique « remplacée ». Le nouveau PDF a une autre référence.
4. Vérifier un document totalement payé : aucune ligne d'impayé affichée.
5. Annuler une quittance : son ancien QR indique « annulé », sans montants.
6. Tester un code aléatoire et un code malformé : aucun document affiché. Vérifier aussi l'accès croisé entre deux propriétaires : émission refusée.

Le QR aide à comparer les informations d'origine ; il ne certifie pas automatiquement les pixels ou tous les champs d'un PDF modifié, ni l'identité de la personne qui le présente. Aucune signature cryptographique certifiée ni abonnement externe n'est ajouté. Le cachet décoratif n'est pas inclus dans cette modification.
