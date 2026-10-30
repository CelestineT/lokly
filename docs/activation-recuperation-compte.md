# Activer la récupération sur une adresse privée

La connexion Supabase, le contact public du bailleur (`profiles.email`) et la récupération privée sont trois informations distinctes. Aucun compte existant n’est renommé automatiquement.

## Activation sur la branche de refonte

1. Dans le SQL Editor Supabase, exécuter `supabase/migrations/20261030_account_recovery.sql`. Cette migration ajoute une table privée et deux fonctions réservées au serveur ; elle ne supprime ni ne renomme aucune donnée métier.
2. Dans Vercel, renseigner pour l’environnement Preview de cette branche :
   - `SUPABASE_SERVICE_ROLE_KEY` : clé serveur Supabase. Ne jamais utiliser de préfixe `NEXT_PUBLIC_` ni la communiquer dans le chat.
   - `RESEND_API_KEY` et `RESEND_FROM_EMAIL` : expéditeur d’un domaine validé dans Resend. Le domaine de test `resend.dev` est refusé pour cette fonction.
   - `ACCOUNT_RECOVERY_ORIGIN` : `https://lokly-git-refonte-visuelle-ekolocs-lockly1.vercel.app` (sans chemin). En production, utiliser `https://app.ekolocs.fr` lorsque ce domaine sera actif.
   Les variables publiques Supabase existantes restent inchangées.
3. Redéployer la branche. La carte d’adresse privée doit alors proposer « Ajouter une adresse privée ». Tant que la configuration est absente, elle indique clairement que la fonction n’est pas opérationnelle.
4. Le propriétaire connecté saisit son adresse privée et son mot de passe actuel. Le serveur envoie une confirmation ; l’adresse ne devient une adresse de récupération qu’après clic puis confirmation sur la page ouverte. Un changement conserve l’ancienne adresse tant que la nouvelle n’est pas validée.
5. Dans Mon compte, modifier séparément l’adresse de connexion (confirmation Supabase) et le mail public du bailleur. Le changement d’adresse de connexion conserve l’identifiant propriétaire et ses données. Les liens de confirmation de connexion utilisent `/auth/callback` : autoriser cette URL dans Authentication → URL Configuration → Redirect URLs pour chaque domaine utilisé.

## Recette avec un compte dédié

- Confirmer une adresse privée distincte ; vérifier que son affichage passe de « en attente » à « vérifiée » après retour/rechargement de Mon compte.
- Se déconnecter, cliquer « Mot de passe oublié ? » et saisir le mail de connexion. Le message arrive à l’adresse privée vérifiée. Sans adresse privée vérifiée, il arrive au mail de connexion.
- Le lien natif Supabase est à usage unique. Choisir un nouveau mot de passe, se reconnecter avec le même mail de connexion et le nouveau mot de passe ; essayer de réutiliser le lien doit échouer.
- Vérifier une nouvelle génération de quittance et son e-mail : le contact public figure dans le PDF et dans Reply-To ; l’adresse privée de récupération n’est jamais lue par ces routes. Les fichiers déjà téléchargés ou transmis ne sont pas réécrits.
- Ne pas utiliser un compte réel pour une recette qui change son mot de passe sans coordination avec son propriétaire.

## Protection et limites

Le serveur vérifie le propriétaire et son mot de passe pour configurer l’adresse privée. Les comptes avec facteurs MFA vérifiés ne sont pas pris en charge par cette configuration et sont refusés. Les jetons de confirmation (30 minutes) sont hachés en base et consommés par une mise à jour conditionnelle atomique. La demande publique renvoie le même message pour un compte connu/inconnu et utilise un délai minimal de deux minutes par compte pour les envois. Elle ne retourne ni l’adresse privée ni un jeton. Les mots de passe sont modifiés via le flux de récupération natif Supabase, pas via une modification administrateur du mot de passe. Les secrets et liens ne sont jamais journalisés.

Cette version ne prouve pas que les boîtes du propriétaire reçoivent les messages : une recette après activation de Supabase/Vercel/Resend reste nécessaire.
