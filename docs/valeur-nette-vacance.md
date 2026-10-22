# Ekolocs — Valeur nette et vacance

## Valeur nette

La vignette porte le titre **Valeur nette** et la mention **Estimation à la revente**. Son infobulle précise : « Valeur estimée de votre bien après remboursement des crédits restants, avant frais de vente et fiscalité. Votre apport initial est déjà compris dans cette valeur. »

Calcul : dernière valeur estimée renseignée − somme des capitaux restant dus estimés à la date de calcul. L’estimation du crédit utilise les paramètres de financement existants, y compris le différé. Elle ne remplace pas un décompte de remboursement fourni par la banque. Une valeur négative est conservée. Les frais et la fiscalité ne sont pas soustraits.

Sans estimation datée ou financement exploitable, la valeur n’est pas calculée : le motif apparaît dans l’infobulle. Pour un bien sans emprunt, renseigner un financement avec montant emprunté égal à zéro. L’absence d’un dossier de financement ne prouve pas l’absence de dette. Au niveau du parc, le total est affiché uniquement si tous les biens du périmètre sont calculables. Les montants d’un immeuble ne sont pas ventilés arbitrairement par lot.

## Vacance des logements

Un calcul commun est utilisé par le tableau de bord et la rentabilité :

**Jours-logements disponibles sans bail / jours-logements disponibles × 100.**

- La disponibilité commence à la date de mise en location renseignée, limitée à la période observée. La date d’acquisition et la première entrée d’un locataire ne remplacent pas cette information.
- La période s’arrête au plus tard à la date du jour.
- Les jours d’entrée et de sortie sont comptés comme occupés. Les chevauchements de baux ne doublent pas les jours occupés.
- Les baux résiliés restent pris en compte entre leurs dates d’entrée et de sortie. Un couple représente une occupation du logement.
- Les boxes, parkings et autres annexes sont exclus du taux des logements.
- Les jours sont comptés dans un calendrier sans effet des changements d’heure. Les pourcentages individuels ne sont pas moyennés : les jours sont additionnés avant de calculer le taux.
- Un appartement comportant un unique lot d’habitation reste un seul logement.
- Les loyers payés, impayés et quittances ne déterminent pas la présence d’un bail.

Si une date manque, si un bail d’immeuble n’est pas rattaché à son logement ou si un bail subsiste après suppression de ses fiches locataires, le taux est signalé comme non calculable. On ne présente pas un historique incomplet comme de la vacance certaine. Le détail explique les données à compléter et présente les décomptes par logement.

Aucune migration SQL n’est requise pour cet affichage. Les dates et rattachements se corrigent dans les formulaires habituels. Cette mise à jour ne supprime ni fiche ni historique.
