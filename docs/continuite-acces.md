# Ekolocs — Continuité d’accès et reprise

Version du 18 octobre 2026. Cette procédure distingue le code livré et les réglages qui restent à effectuer dans les comptes d’hébergement. Elle ne signifie pas qu’un second administrateur, une sauvegarde automatique ou une restauration serveur a déjà été activé.

## 1. Archive du compte dans Ekolocs

Dans **Paramètres → Sauvegarde et continuité d’accès**, saisir puis confirmer une phrase secrète d’au moins 12 caractères, préparer l’archive, puis cliquer sur **Télécharger l’archive**. La génération ne garantit pas à elle seule que le fichier a été conservé : vérifier sa présence dans les téléchargements et en garder une copie hors de l’hébergement.

L’export contient les lignes appartenant au compte connecté : profil et signature, biens, lots, baux et révisions, occupants, rattachements d’annexes, paiements, quittances, dépenses, financements, documents et alertes. Il copie aussi les fichiers du bucket `documents` sous le préfixe du compte, avec un inventaire et des empreintes SHA-256. Les listes sont paginées. Les dossiers, les fichiers et les lignes d’autres comptes sont exclus.

L’archive est chiffrée localement par AES-256-GCM, avec une clé PBKDF2-SHA-256 (310 000 itérations, sel aléatoire de 16 octets, nonce aléatoire de 12 octets). La phrase secrète ne quitte pas le navigateur et n’est pas conservée par Ekolocs. Sans cette phrase, l’archive ne peut pas être déchiffrée. La confier au dispositif de secours prévu dans un gestionnaire de mots de passe, séparément du fichier.

Limites : 50 Mo de données et documents pour cet export depuis le navigateur. Ce n’est pas un instantané transactionnel de la base : ne pas modifier les données pendant la préparation. Deux lectures des tables et des inventaires sont comparées ; un changement détecté interrompt l’export. Les fichiers téléchargés sont contrôlés par empreinte lors de la vérification hors ligne. Les URL externes sont recensées mais leurs fichiers ne sont pas téléchargés. Les comptes Auth, mots de passe, sessions, codes OTP, schéma SQL, politiques RLS, secrets, autres buckets et réglages des fournisseurs ne sont pas inclus. Les quittances générées à la demande sont sauvegardées sous forme de données ; conserver séparément tout PDF original nécessaire.

Fréquence proposée : après une saisie importante et avant une évolution de structure, puis une fois par semaine tant qu’une sauvegarde serveur automatique indépendante n’a pas été validée. Cette fréquence est une règle de travail proposée, pas une tâche déjà planifiée.

## 2. Vérification et préparation d’une restauration

Confier cette étape à la personne chargée de la reprise. Installer Python 3 et la dépendance `cryptography` dans un environnement local maîtrisé (`python -m pip install cryptography`). Ne jamais transmettre la phrase secrète dans un chat ou en argument de commande.

```sh
python scripts/verify_account_backup.py /chemin/archive.ekolocs
```

Le script demande la phrase secrète sans l’afficher, contrôle le chiffrement, les empreintes, les identifiants, les liens entre les tables et l’appartenance au compte. Il n’accède à aucun serveur.

Pour préparer un dossier de reprise, **choisir un nouveau dossier privé** :

```sh
python scripts/verify_account_backup.py /chemin/archive.ekolocs --prepare-recovery /chemin/reprise-ekolocs
```

Le dossier préparé contient des informations en clair, dont coordonnées bancaires, signatures et notes privées. Le stocker sur un support protégé et le retirer après utilisation. Il contient les JSON, les fichiers Documents et `restauration-a-relire.sql`. Le script n’exécute jamais ce SQL.

Avant toute exécution du SQL :

1. Créer une copie de reprise isolée, avec le schéma et les migrations de la version concernée. Ne pas faire le premier essai sur la production.
2. Préserver ou restaurer le compte Auth avec **son UUID d’origine** via les procédures d’administration Supabase. Créer simplement un nouveau compte avec la même adresse ne préserve pas son UUID. Ce compte n’est pas recréé par l’archive applicative.
3. La destination doit être vide pour les données de cet UUID, y compris son profil. Le SQL refuse une destination non vide et une référence absente. Ne pas supprimer de données existantes pour contourner ce contrôle sur la production. Les profils créés automatiquement lors d’un provisionnement doivent être examinés par l’administrateur sur la copie isolée.
4. Relire le SQL puis l’exécuter sur la copie isolée avec les droits adaptés. Il conserve les identifiants, utilise une transaction, ne contient ni suppression, ni écrasement de conflit, ni modification des politiques RLS. Les liens parentaux sont rétablis après les insertions pour gérer les dépendances entre biens et lots.
5. Réimporter `files/documents/<UUID>/...` dans le bucket **privé** `documents`, aux mêmes chemins et avec les politiques de lecture/écriture du compte. Les liens externes ou anciennes URL publiques peuvent nécessiter une remise à jour séparée.
6. Tester la connexion du propriétaire, un bien et ses lots, un couple, un ancien locataire, les historiques de loyers, les encaissements, une quittance et les fichiers joints. Comparer les comptes de lignes et montants. Vérifier qu’un autre compte ne voit pas ces données.
7. Consigner la date, la version du code, le résultat et la durée de la reprise. Un test automatisé local du format ne remplace pas cet essai de restauration réel.

## 3. Sauvegarde serveur indépendante — à configurer

L’archive applicative complète une sauvegarde native de la plateforme. Dans Supabase, vérifier **Database → Backups**, la rétention disponible dans le plan souscrit et la méthode de restauration. Pour un plan sans sauvegardes automatiques adaptées, mettre en place un export serveur régulier avec la procédure officielle CLI. Garder des copies hors du projet et vérifier une restauration sur un environnement distinct. Ne jamais ajouter une clé privilégiée ou un mot de passe PostgreSQL au code du navigateur ou au dépôt.

Les sauvegardes de base Supabase ne comprennent pas les fichiers Storage eux-mêmes : les sauvegarder séparément. Inclure le schéma, les rôles nécessaires, les données Auth selon la procédure officielle, tous les buckets utiles, les réglages d’authentification, les redirections et le relevé des variables d’environnement dans un coffre sécurisé. Ne pas placer les secrets dans cette documentation.

Cette étape exige un accès d’administration à Supabase et au stockage cible. Elle n’est pas activée par le bouton d’export et n’a pas été exécutée depuis le développement de l’application.

## 4. Second administrateur — à configurer et tester

Un utilisateur de l’application et un administrateur de l’hébergement ont des fonctions différentes. Les données Ekolocs sont isolées par propriétaire ; aucune règle RLS n’est élargie pour donner un accès universel à un deuxième utilisateur.

| Service | Action à réaliser par la propriétaire | Validation attendue |
| --- | --- | --- |
| Supabase | Organisation du projet → paramètres de l’équipe : inviter la personne de confiance comme **Owner** si elle doit assurer la relève complète. Ce rôle est étendu : vérifier les autres projets présents dans l’organisation. | Invitation acceptée, connexion depuis un compte distinct, accès au bon projet et aux procédures de sauvegarde/restauration. |
| Vercel | Vérifier le plan et les membres de l’équipe. Inviter la personne avec les droits nécessaires au déploiement et à la relève. La collaboration d’équipe peut nécessiter Pro ; ne pas modifier l’abonnement sans accord. | Elle peut retrouver le projet, consulter les déploiements, identifier recette/production et les paramètres indispensables. |
| GitHub | Pour un dépôt personnel : accès collaborateur pour le code, et dispositif de relève du compte propriétaire. Pour une organisation : au moins deux propriétaires. Un collaborateur ne remplace pas automatiquement la propriété du dépôt personnel. | Clone du dépôt possible et procédure de déploiement comprise, sans partage de votre session. |
| Domaine et DNS | Identifier le registraire réel de `ekolocs.fr` ; donner un accès délégué lorsque possible et conserver les informations de renouvellement dans le coffre de secours. | Connexion et capacité à gérer DNS/renouvellement. |
| Coffre et comptes | MFA sur les comptes d’infrastructure, méthodes de récupération et codes de secours conservés hors du téléphone principal. Prévoir le dispositif d’accès d’urgence du coffre. | La personne peut accéder au dispositif de secours selon la procédure convenue ; aucun mot de passe personnel n’est partagé par messagerie. |

Ne jamais supprimer le compte principal pour « essayer ». Le test est une connexion indépendante depuis un autre navigateur ou une session privée, puis un test de reprise sur une copie.

La continuité n’est considérée validée qu’après acceptation des invitations, vérification des accès, sauvegarde indépendante disponible et essai de restauration réussi. La personne de confiance et son adresse d’invitation restent à désigner ; aucune invitation n’est envoyée automatiquement.

## Références officielles consultées

- Supabase — [Access Control](https://supabase.com/docs/guides/platform/access-control)
- Supabase — [Database Backups](https://supabase.com/docs/guides/platform/backups)
- Supabase — [Backup and Restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- Vercel — [Managing Team Members](https://vercel.com/docs/rbac/managing-team-members)
- GitHub — [Maintaining ownership continuity](https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/maintaining-ownership-continuity-for-your-organization)
