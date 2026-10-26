# Twilio — raccordement limité aux SMS de test

## Ce qui est intégré
Le mode de préparation des neuf modèles reste gratuit et sans envoi. Un panneau séparé **Test réel avec Twilio** permet de saisir un texte et de demander un seul envoi vers le téléphone défini côté serveur. Aucune liste de locataires ni numéro transmis par le navigateur ne peut être utilisé comme destination. Aucun SMS n’est envoyé automatiquement au déploiement.

Ce raccordement ne lance pas les campagnes groupées aux locataires. L’étape suivante sera leur gestion d’envoi avec destinataires contrôlés, journal, consentements, quotas et confirmation des coûts.

## 1. Compte Twilio
Créer ou ouvrir le compte Twilio. Utiliser la région API par défaut US1 pour cette première intégration. Configurer l’expéditeur et les droits d’envoi vers la France selon les indications Twilio. Créer une API Key autorisée à créer et lire des messages, puis conserver son SID et son secret. Ne jamais copier le secret dans le chat, une capture d’écran ou le dépôt Git.

La documentation actuelle des essais Twilio prévoit des restrictions de pays, de numéros vérifiés et de contenus prédéfinis. L’envoi des modèles personnalisés Ekolocs et l’usage d’un expéditeur alphanumérique peuvent nécessiter l’activation d’un compte payant. Les anciennes et nouvelles consoles peuvent proposer des parcours différents : vérifier ce qui est autorisé dans le compte avant de payer ou d’envoyer.

Documentation officielle :
- https://www.twilio.com/docs/usage/trials
- https://www.twilio.com/docs/messaging/quickstart
- https://www.twilio.com/docs/trust-hub/registrations/alphanumeric-sender-id

## 2. Vercel — variables serveur
Ajouter les variables dans l’environnement qui déploie la recette (Preview pour un déploiement de branche), puis redéployer. Ne jamais utiliser le préfixe NEXT_PUBLIC pour ces valeurs.

| Variable | Valeur à renseigner |
| --- | --- |
| SMS_MODE | twilio_test |
| TWILIO_ACCOUNT_SID | SID du compte commençant par AC |
| TWILIO_API_KEY_SID | SID de la clé API commençant par SK |
| TWILIO_API_KEY_SECRET | Secret de cette clé, conservé uniquement dans Vercel |
| TWILIO_SMS_FROM | LE BAILLEUR si validé par Twilio, sinon numéro Twilio autorisé au format international |
| SMS_TEST_TO | Votre numéro de test au format international, par exemple +336… |
| SMS_TEST_OWNER_IDS | Identifiant(s) des comptes Ekolocs autorisés, séparés par une virgule |

Le propre identifiant du compte Ekolocs connecté est affiché dans le panneau tant que la configuration n’est pas complète. Les numéros de test ne sont jamais remplacés par ceux des locataires lors de la préparation.

## 3. Supabase — migration et autorisation
Exécuter `supabase/migrations/20261026_twilio_sms_tests.sql` dans le SQL Editor de la base de recette.

Puis autoriser explicitement le compte dans cette base :

```sql
-- Remplacer la valeur entre guillemets par l’identifiant affiché dans Ekolocs.
insert into public.sms_test_autorisations (proprietaire_id)
values ('IDENTIFIANT_UUID_DU_COMPTE_EKOLOCS')
on conflict do nothing;
```

Il faut être autorisé à la fois dans cette table administrée et dans SMS_TEST_OWNER_IDS. Aucun utilisateur ne peut s’autoriser lui-même depuis le navigateur. Les clés Twilio ne vont pas dans Supabase ni dans ce SQL.

La migration ne modifie aucun bien, bail, paiement ou quittance. Elle ajoute un journal privé de tests et une liste d’autorisation. Aucun texte SMS ni numéro complet n’est conservé dans le journal : seulement les quatre derniers chiffres, le nombre de segments estimé, l’empreinte de la demande et les références/statuts Twilio.

## 4. Premier essai réel
1. Ouvrir **Communication → Envoyer des SMS**, puis descendre à **Test réel avec Twilio**.
2. Vérifier les quatre derniers chiffres du téléphone et l’expéditeur configuré.
3. Saisir un message court (maximum trois segments par essai) ; ne laisser aucun champ entre accolades.
4. Cocher la confirmation autorisant cet envoi vers un numéro qui vous appartient ou celui d’un testeur ayant donné son accord.
5. Cliquer **Envoyer le SMS de test réel**. Cet essai peut consommer des crédits Twilio ; il est distinct du bouton de simulation gratuite.
6. Cliquer **Actualiser le suivi — sans renvoyer** et vérifier aussi le téléphone.

L’état « queued » ou « sent » ne signifie pas réception confirmée. Seul « delivered » est présenté comme une confirmation de réception remontée par Twilio. Il ne s’agit pas d’une preuve de lecture.

## Protection des essais
- Sans SMS_MODE=twilio_test, autorisation, credentials, numéro ou migration, aucun envoi n’est effectué.
- Destination fixée sur le serveur ; les champs To et From du navigateur ne sont pas pris en compte.
- Une réservation durable et atomique précède l’appel à Twilio. Le même identifiant ne déclenche pas un second envoi, même après une panne réseau ou un double clic.
- Limites fixes : trois segments par message, cinq tentatives par propriétaire et vingt segments au total par jour UTC, toutes tentatives réservées comprises. Ces limites ne sont pas un plafond monétaire et ne couvrent pas d’autres applications utilisant le même compte Twilio.
- Les erreurs et timeouts incertains ne sont pas réessayés automatiquement. Vérifier la console Twilio avant un nouveau test.
- Les clés restent exclusivement côté serveur. Aucun webhook entrant n’est utilisé : le suivi se fait sur demande via l’API Twilio authentifiée.
- L’actualisation peut ne pas fonctionner si la destination de test ou le compte Twilio a changé depuis l’envoi : consulter alors la console du compte d’origine.

## Validation technique
`node tests/twilio-test-regressions.cjs` : appels API simulés, contrôles d’accès, destination serveur, confirmations, doublons, timeout et suivi. Aucun SMS réel n’est envoyé par les tests automatisés.

`PGLITE_MODULE=/chemin/vers/@electric-sql/pglite node tests/twilio-test-sql.cjs` : migration, autorisations RLS, quotas et réservations sous PostgreSQL local.

L’activation des variables et de la migration, puis l’observation d’un SMS reçu sur le téléphone, restent nécessaires pour valider le raccordement de bout en bout avec le vrai compte.
