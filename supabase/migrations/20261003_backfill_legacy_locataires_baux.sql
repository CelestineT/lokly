-- Correctif recette — rattachement des lots annexes pour les locataires historiques
--
-- Les locataires créés avant l'introduction de la table baux peuvent avoir
-- bail_id = null. Dans ce cas la fiche locataire ne peut pas proposer le
-- rattachement d'un box, parking, garage ou cave, car les affectations de lots
-- annexes sont désormais rattachées au bail.
--
-- Ce backfill crée un bail individuel pour chaque locataire historique qui
-- n'en possède pas encore, puis rattache le locataire à ce bail.
-- Il ne tente volontairement pas de deviner un lot principal : le bien_id
-- suffit pour proposer les lots annexes disponibles du même bien.

DO $$
DECLARE
  loc record;
  new_bail_id uuid;
BEGIN
  FOR loc IN
    SELECT *
    FROM public.locataires
    WHERE bail_id IS NULL
    ORDER BY created_at
  LOOP
    INSERT INTO public.baux (
      proprietaire_id,
      bien_id,
      lot_id,
      type_occupation,
      date_entree,
      date_sortie,
      loyer_hc,
      charges,
      caution,
      caution_payee,
      duree_bail_ans,
      echeance_bail,
      mode_paiement,
      commentaire,
      actif,
      created_at
    ) VALUES (
      loc.proprietaire_id,
      loc.bien_id,
      NULL,
      'individuel',
      loc.date_entree,
      loc.date_sortie,
      COALESCE(loc.loyer_hc, 0),
      COALESCE(loc.charges, 0),
      loc.caution,
      COALESCE(loc.caution_payee, false),
      COALESCE(loc.duree_bail_ans, 3),
      loc.echeance_bail,
      loc.mode_paiement,
      loc.commentaire,
      COALESCE(loc.actif, true),
      COALESCE(loc.created_at, now())
    )
    RETURNING id INTO new_bail_id;

    UPDATE public.locataires
    SET bail_id = new_bail_id,
        est_principal = true
    WHERE id = loc.id;
  END LOOP;
END $$;
