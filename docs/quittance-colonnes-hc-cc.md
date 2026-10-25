# Colonnes HC/CC, filigrane et signature

Le tableau du PDF répartit le loyer et la caution dans MONTANT HC*, puis la provision sur charges, le solde, les annexes et la régularisation dans MONTANT CC*. Une seule valeur est imprimée pour chaque ligne : aucune somme n’est dupliquée. La légende « HC : Hors Charges et CC : Charges comprises » est imprimée en petits caractères sur la ligne du mode de paiement.

La caution porte la précision « Dépôt de garantie : N mois HC ». Le nombre de mois est calculé à partir du loyer mensuel de référence, jamais à partir du loyer proratisé. Le PDF récupère cette référence depuis le détail historique de prorata ou depuis le bail au mois de la quittance. Une caution de 1 240 € pour un loyer mensuel de 620 € indique 2 mois HC, même si le loyer du premier mois est de 320 €.

Le grand filigrane diagonal qui traversait les lignes du document est supprimé. Le statut PAYÉ / PARTIELLEMENT PAYÉ / À PAYER est dessiné une seule fois, sur la dernière page, dans une réserve blanche du bloc bancaire après les totaux. Sa largeur ne dépasse pas la partie gauche des libellés. Les tests vérifient qu’il ne chevauche aucun texte. Les blocs du bas restent au-dessus du pied de page ; si l’espace manque, ils sont reportés sur une page suivante.

La date et le titre de signature sont centrés dans le bloc de droite, en bas du dernier feuillet. L’image de signature est centrée horizontalement sous ces informations et reste contenue dans le bloc. Les autres mentions, le logo et le lien du site restent inchangés. Aucun calcul enregistré, aucun paiement et aucune donnée de bail ne sont modifiés. Pas de migration SQL nécessaire.

Vérifications : contrôle des coordonnées de chaque montant dans HC ou CC, légende sur la ligne du mode de paiement, caution rapportée au loyer mensuel, absence de chevauchement pour les trois statuts, signature centrée, document sur plusieurs pages, tests de mise en page existants et tests des parcours paiement/quittance. Contrôle visuel du PDF fictif et compilation Next.js.
