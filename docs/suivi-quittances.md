# Suivi des quittances

Le bouton de la synthèse affiche le dernier **envoi réel** enregistré, pas une ancienne tentative de test. Un clic consulte Resend sans expédier un nouveau message. « E-mail délivré » décrit le résultat technique du message fournisseur ; ce n’est pas une preuve de lecture humaine ni un accusé individuel de chaque copie.

Le suivi utilise `RESEND_TRACKING_API_KEY` lorsque cette variable serveur est définie, sinon `RESEND_API_KEY`. Une clé Resend limitée à **Sending access** ne peut pas consulter les e-mails. Pour conserver une clé d’envoi restreinte, ajouter une clé distincte **Full access**, du même compte Resend, comme `RESEND_TRACKING_API_KEY` dans Vercel pour l’environnement concerné puis reconstruire le déploiement. Ne jamais transmettre sa valeur dans un ticket ou la préfixer NEXT_PUBLIC.

Les erreurs de droits, référence introuvable, limite de consultations et indisponibilité sont distinguées. Un statut inconnu n’est jamais transformé en succès. Aucun renvoi n’est déclenché pour actualiser le suivi. Les événements d’ouverture ou de clic peuvent indiquer une remise technique antérieure, sans établir que le locataire a personnellement lu le document.

Les pièces sont expédiées via Resend et non via la session IMAP Hostinger du bailleur. Le parcours d’envoi conserve la copie cachée vers l’adresse du profil du bailleur (si différente du destinataire), qui se cherche dans la réception ou les indésirables. Cela n’archive pas le message dans les Éléments envoyés Hostinger. Pour un message déjà parti, vérifier son journal Resend et les destinataires réels avant toute relance ; une préférence affichée aujourd’hui ne garantit pas les paramètres d’un ancien envoi.

Pour activer les SMS vers les locataires, il faut `SMS_MODE=production`, les UUID des comptes autorisés dans `SMS_OWNER_IDS`, et un compte `sms_comptes` actif avec assez de segments pour chacun. Conserver l’expéditeur BAILLEUR et les clés du même compte Twilio. Une modification Vercel demande un nouveau déploiement. L’activation ne déclenche aucun SMS : le bailleur choisit ensuite le modèle et les destinataires, contrôle le coût en segments puis confirme l’envoi. Les crédits internes ne sont pas le solde monétaire Twilio. Ce chantier de suivi ne change pas le mode SMS ni les crédits.

Contrôles : `node tests/receipt-delivery-tracking-regressions.cjs`, puis les régressions d’envoi, d’OTP et de présentation du PDF. Les appels fournisseurs des tests sont simulés ; ils ne remplacent pas une consultation de l’envoi réel avec une clé autorisée.
