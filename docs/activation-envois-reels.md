# Activation des SMS groupés et des quittances par e-mail

Version de recette : branche `refonte-visuelle-ekolocs`. Ce déploiement ne bascule pas l’application en production.

## 1. Base Supabase existante

Projet attendu : `ztqclqkbpbpoqlctwlue` (Lokly/Ekolocs). Migration appliquée le 31 octobre 2026 via l’intégration Supabase : `supabase/migrations/20261031181756_envois_reels.sql`. Les tables, RLS et privilèges ont été vérifiés sur le projet ; ne pas réexécuter ce fichier. Elle ajoute les comptes SMS, campagnes, journaux SMS et e-mail et leurs fonctions ; elle ne modifie pas les biens, locataires ou paiements.

Les journaux sont protégés par RLS. Les comptes authentifiés peuvent lire uniquement leurs lignes ; ils ne peuvent ni ajouter des crédits ni modifier directement les journaux. Les réservations et écritures passent par des fonctions contrôlées, à privilèges limités et propriété vérifiée.

## 2. Variables Vercel — environnement Preview d’abord

Aucune clé secrète ne doit être publiée, committée, affichée côté navigateur ou collée dans une conversation.

| Variable | Usage |
|---|---|
| `TWILIO_ACCOUNT_SID` | Compte Twilio existant |
| `TWILIO_API_KEY_SID` | Clé serveur Twilio |
| `TWILIO_API_KEY_SECRET` | Secret serveur Twilio |
| `TWILIO_SMS_FROM` | Expéditeur autorisé dans Twilio |
| `SMS_MODE` | `production` active le parcours réel (même en Preview) ; l’environnement Vercel et le mode SMS sont indépendants |
| `SMS_OWNER_IDS` | UUID des propriétaires autorisés, séparés par virgules |
| `RESEND_API_KEY` | Clé serveur Resend autorisée à envoyer et consulter les e-mails |
| `RESEND_FROM_EMAIL` | Adresse expéditeur sur un domaine vérifié dans Resend |
| `QUITTANCE_EMAIL_MODE` | `test` pour les essais ; `production` pour le locataire réel |
| `QUITTANCE_TEST_EMAILS` | Adresses de test explicitement autorisées, séparées par virgules |

Les variables `SMS_TEST_*` restent réservées à l’ancien panneau d’essai vers un seul téléphone. Elles n’autorisent pas l’envoi groupé. Le compte Twilio doit être compatible avec les destinations et l’expéditeur configurés ; un compte d’essai peut limiter les numéros autorisés.

Redéployer la recette après modification des variables Vercel.

## 3. Autorisation SMS et réserve de segments

Un propriétaire doit être autorisé à la fois dans `SMS_OWNER_IDS` et dans `sms_comptes`. Aucun compte ni crédit n’est créé automatiquement.

Dans l’éditeur SQL Supabase, après choix du compte et du plafond :

```sql
-- Remplacer les deux valeurs avant d’exécuter : aucun montant financier n’est débité ici.
insert into public.sms_comptes(proprietaire_id,actif,solde_segments)
values ('UUID_DU_PROPRIETAIRE',true,NOMBRE_DE_SEGMENTS_AUTORISES)
on conflict (proprietaire_id) do update set actif=excluded.actif;
```

La clause de conflit ne recharge pas le solde. Les recharges commerciales et le paiement de crédits ne sont pas implémentés par cette évolution. Les frais réels restent portés par le compte Twilio et peuvent différer du nombre de segments estimé.

Le lancement réserve les segments de tous les SMS, une seule fois par campagne. Un échec ou un résultat incertain ne restitue pas automatiquement les segments. Plafonds : 50 destinataires sélectionnés par campagne, 100 messages sur 24 heures glissantes par propriétaire, 10 segments maximum par message. Les SMS partent par groupes de 5 requêtes parallèles pour borner le temps de chaque action.

## 4. Recette SMS réelle

1. Sélectionner uniquement un locataire de test dont le téléphone est celui d’un testeur consentant.
2. Vérifier le message et le numéro dans l’aperçu, puis confirmer l’envoi réel.
3. Vérifier l’entrée dans Twilio et utiliser « Actualiser sans renvoyer » pour suivre sa remise.
4. Vérifier le SMS sur le téléphone. « Transmis » ne signifie pas « reçu ».
5. Vérifier qu’une reprise de la même campagne ne renvoie pas les messages déjà démarrés.

Une campagne interrompue conserve sa clé dans la session du navigateur, séparément pour chaque propriétaire. Une nouvelle campagne identique peut produire de nouveaux SMS : ne pas la lancer avant d’avoir vérifié un résultat incertain.

## 5. Recette e-mail réelle

1. En mode `test`, ouvrir un document et vérifier les adresses de test affichées.
2. Signer et envoyer : vérifier la pièce jointe et la réception dans une boîte contrôlée.
3. Vérifier que l’essai ne marque pas le document envoyé au locataire.
4. Après validation du domaine Resend et du mode réel, sélectionner un document de test et un destinataire consentant.
5. Le code OTP est alors adressé au bailleur, jamais affiché dans le navigateur. Le document est adressé au locataire avec une copie au bailleur.
6. Vérifier le PDF, sa régularisation, sa caution éventuelle et son titre selon le règlement ; actualiser le suivi pour distinguer accepté, remis et rejeté.

Une réservation PostgreSQL empêche les envois simultanés ou répétés d’une même version. Une clé d’idempotence Resend complète cette protection. Un résultat incertain nécessite une vérification dans Resend et n’est pas renvoyé automatiquement. Une version corrigée ou un destinataire modifié constituent un nouvel envoi. Une suppression de document supprime son journal associé ; ne pas supprimer/recréer pour contourner un résultat incertain.

## Validation technique effectuée

Tests unitaires des parcours serveur SMS et e-mail avec prestataires simulés ; tests PostgreSQL embarqué de la migration, des permissions, de l’isolation entre propriétaires et des réservations uniques ; tests de non-régression des PDF, paiements, signature, notes et modèles SMS ; compilation Next.js.

La migration est également appliquée sur Supabase. Les contrôles serveur confirment RLS active, aucune lecture anonyme et aucune écriture directe des clients sur les quatre nouvelles tables. Les contrôles de sécurité n’ajoutent pas d’avertissement pour ces objets. La validité des clés Vercel, la vérification du domaine Resend et la remise d’un message réel restent à confirmer lors de l’activation.
