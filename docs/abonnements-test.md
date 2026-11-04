# Abonnements Ekolocs — préparation en mode test

Commercialisation : Synteya Partners. Prix finaux proposés en EUR :
Essentiel 490 centimes/mois ou 4900/an, 2 logements ;
Patrimoine 990/mois ou 9900/an, 10 logements ;
Investisseur 1990/mois ou 19900/an, 25 logements ; au-delà sur devis.
SMS non inclus.

## Ce qui est livré
- /dashboard/abonnement, accessible dans la navigation.
- Droits account_access, lecture strictement limitée au propriétaire, aucune écriture utilisateur.
- Comptes existants conservés (legacy). Nouveaux comptes : date de fin d'essai à 30 jours.
- Droit lifetime accordé par une opération administrative vérifiée au compte du compagnon.
  Ce droit n'est ni créé depuis l'email de connexion, ni depuis user_metadata.
- Checkout et synchronisation d'abonnements exclusivement Stripe TEST.
- Les paiements de test n'activent jamais de droits commerciaux réels.
- Pas de suppression de données ni de blocage des comptes existants.

## Configuration par la propriétaire
1. Créer le compte Stripe de Synteya Partners sur https://dashboard.stripe.com/register.
2. Utiliser un environnement de test Stripe (sandbox). Ne pas passer aux clés réelles.
3. Dans Vercel, configurer côté serveur :
   BILLING_MODE=test
   STRIPE_SECRET_KEY : clé secrète du test, préfixe sk_test_
   STRIPE_WEBHOOK_SECRET : secret whsec_ du point de terminaison test ci-dessous
   SUPABASE_SERVICE_ROLE_KEY : clé serveur Supabase, si absente. Jamais NEXT_PUBLIC_.
4. Créer un point de terminaison Stripe test :
   https://app.ekolocs.fr/api/abonnement/webhook
   Événements customer.subscription.created, customer.subscription.updated,
   customer.subscription.deleted. API 2026-09-30.endive.
5. Redéployer après changement de variables.
6. Se connecter avec un compte de recette, ouvrir Mon abonnement et utiliser uniquement
   une carte fictive documentée par Stripe : https://docs.stripe.com/testing.
7. Vérifier le retour vers Ekolocs, la réception du webhook et le statut test dans la page.
   Annuler dans Stripe test et vérifier le statut après webhook. Le retour du navigateur
   n'est jamais une preuve de paiement.
8. Vérifier que le compte lifetime n'a aucun bouton de paiement activé.

Le montant et la périodicité sont construits sur le serveur depuis le catalogue.
Les clés sk_live_ sont refusées. Le webhook vérifie le corps brut signé, une tolérance
de 5 minutes, livemode=false, puis relit l'abonnement chez Stripe.
Il vérifie le tarif et ne modifie que billing_test_subscriptions, jamais account_access.
L'idempotence du Checkout utilise une fenêtre de 30 minutes par compte :
changer de formule dans cette fenêtre peut être refusé par Stripe (ne pas multiplier les essais).
La synchronisation de recette ne constitue pas encore un moteur de facturation réel.
Les tests de paiement restent à exécuter après configuration effective du compte Stripe.

## Avant ouverture commerciale (pas encore activé)
- Finaliser le régime TVA de Synteya Partners, les factures, CGV et informations légales.
- Définir le comptage des parkings/box loués indépendamment et les plafonds de stockage.
- Implémenter et tester les limites dans toutes les écritures côté serveur/DB :
  ne pas se contenter de masquer des boutons côté navigateur.
- Activer le bandeau d'essai, le parcours de souscription et la lecture seule après expiration,
  tout en conservant les téléchargements. Essai actuellement enregistré sans blocage.
- Intégrer le portail client (résiliation, factures, changement de formule).
- Utiliser des objets/prix et un journal Stripe réel séparés ; contrôler les abonnements
  concurrents, webhooks désordonnés/rejoués, impayés et résiliations.
- Tests complets puis autorisation explicite avant encaissement réel.

## Raccordement Stripe effectué le 4 novembre 2026
Compte sandbox acct_1UXjUHGZPzm5uH45, aucune modification réelle.
Produits : ekolocs_essentiel_v1, ekolocs_patrimoine_v1, ekolocs_investisseur_v1.
Six tarifs persistants, lookup keys ekolocs_{formule}_{month|year}_v1.
Les identifiants des prix sont dans STRIPE_PRICE_{FORMULE}_{MONTH|YEAR} sur Vercel.
Le Checkout vérifie le compte, le produit, le montant, la devise et la périodicité.
Clés secrètes test sk_test_ et clés restreintes rk_test_ acceptées ; les clés live sont refusées.
Configuration de portail STRIPE_PORTAL_CONFIGURATION : factures, moyen de paiement,
résiliation en fin de période. Changement de formule désactivé tant que les limites ne sont pas appliquées.
Webhook test créé et STRIPE_WEBHOOK_SECRET transmis directement à Vercel.
BILLING_MODE=test et STRIPE_ACCOUNT_ID déjà renseignés côté serveur.
Restent à renseigner STRIPE_SECRET_KEY et SUPABASE_SERVICE_ROLE_KEY dans Vercel
pour autoriser l'application à utiliser les API ; l'autorisation de l'agent ne fournit pas
ces secrets au serveur de l'application.
Aucun secret enregistré dans les sources ou ce document.
