# Modèles SMS — préparation et simulation

## Accès
Depuis **Communication → Envoyer des SMS**. L’onglet Communication se situe après Documents et avant Paramètres, dans le menu sur ordinateur et sur mobile. URL conservée : `/dashboard/sms`.

Les neuf modèles approuvés sont intégrés au code. L’expéditeur prévu est **BAILLEUR** (8 caractères). Aucun nouveau SQL, compte SMS ou secret n’est requis pour la simulation.

## Tester
1. Choisir un modèle ; son texte est modifiable pour cette préparation.
2. Filtrer les destinataires par bien et nom, puis les sélectionner. Les modèles individuels acceptent un seul destinataire. Les anciens locataires restent masqués sauf choix explicite.
3. Renseigner les dates et coordonnées manquantes. Le mail et le téléphone du bailleur sont initialisés depuis son compte ; ils restent modifiables. Pour la révision des loyers, saisir montant et date par destinataire et confirmer les vérifications/courriers. Aucun bail ou paiement n’est modifié.
4. Lire les aperçus individuels : textes personnalisés, numéros normalisés, GSM-7/Unicode et segments. Les champs incomplets, dates incohérentes, montants invalides ou numéros non valides empêchent la simulation. Deux destinataires avec le même numéro et le même texte sont regroupés ; des textes différents vers un même numéro bloquent la préparation jusqu’à correction.
5. Indiquer éventuellement le tarif par segment en EUR ou USD selon le prestataire envisagé. Aucun tarif réel n’est supposé. Les frais supplémentaires éventuels ne sont pas inclus.
6. Cliquer **Simuler l’envoi — gratuit** : afficher le récapitulatif sans envoi, sans facturation ni écriture en base.

Les changements de texte/paramètres et la simulation restent en mémoire dans la page ; ils ne sont pas conservés après fermeture ou rechargement. Les modèles par défaut sont disponibles à chaque ouverture. Aucun SMS reçu sur téléphone n’est attendu dans ce mode.

## Compteur
GSM-7 : 160 unités pour un segment, puis 153 par segment multipartie. Les caractères d’extension (par exemple €) utilisent deux unités. Unicode : 70 unités UTF-16 pour un segment, puis 67. Les emojis peuvent compter deux unités. Le compteur porte sur le message final après personnalisation. Une simplification de ponctuation est proposée sans supprimer les accents ou changer les noms des locataires.

## Suite à prévoir pour les envois réels
Choisir le prestataire (Twilio, Brevo ou autre), vérifier ses règles France, valider l’expéditeur et les conditions de réception des notifications, puis raccorder l’API côté serveur. Prévoir une confirmation finale, des autorisations contrôlées à nouveau côté serveur, une clé d’idempotence, un historique et les retours de livraison. Faire d’abord un test limité à un numéro appartenant au propriétaire. Ne jamais considérer l’état « simulation réussie » comme une preuve d’envoi réel.

## Validation
`node tests/sms-preparation-regressions.cjs` : neuf modèles, limites de segments, Unicode/emoji, champs personnalisés, dates et montants, numéros partagés, authentification et périmètre propriétaire, absence d’appel fournisseur.


## Mise à jour du 6 novembre 2026

L’expéditeur de l’application et `TWILIO_SMS_FROM` sont alignés sur **BAILLEUR**, à la demande du propriétaire. Le succès d’un test antérieur ne garantit pas la remise chez tous les opérateurs. Aucun SMS n’est envoyé par un déploiement ou un changement de configuration.

Le suivi regroupe les envois récents par campagne : date (heure de Paris), nombre de SMS affichés, réceptions confirmées, échecs/annulations et suivis en cours. Les campagnes précédentes sont repliées ; la campagne démarrée dans la session reste visible. « Actualiser sans renvoyer » reste accessible dans chaque campagne. Un nouveau résultat est fusionné avec les autres campagnes sans effacer leur affichage. La requête conserve la limite existante de 50 SMS au chargement ; aucune donnée n’est supprimée.
