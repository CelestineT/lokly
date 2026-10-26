BEGIN;
CREATE TABLE IF NOT EXISTS public.sms_test_autorisations (
 proprietaire_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.sms_test_autorisations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sms_test_autorisations FROM anon,authenticated;
GRANT SELECT ON public.sms_test_autorisations TO authenticated;
DROP POLICY IF EXISTS sms_tests_authorization_read ON public.sms_test_autorisations;
CREATE POLICY sms_tests_authorization_read ON public.sms_test_autorisations FOR SELECT TO authenticated USING(proprietaire_id=auth.uid());
CREATE TABLE IF NOT EXISTS public.sms_test_envois (
 id uuid PRIMARY KEY,
 proprietaire_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 empreinte text NOT NULL,
 segments integer NOT NULL CHECK(segments BETWEEN 1 AND 3),
 destinataire_fin text NOT NULL CHECK(destinataire_fin ~ '^[0-9]{4}$'),
 statut text NOT NULL DEFAULT 'reserved',
 twilio_sid text,
 code_erreur text,
 cree_le timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_test_envois ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sms_test_envois FROM anon,authenticated;
GRANT SELECT ON public.sms_test_envois TO authenticated;
DROP POLICY IF EXISTS sms_tests_owner_read ON public.sms_test_envois;
CREATE POLICY sms_tests_owner_read ON public.sms_test_envois FOR SELECT TO authenticated USING(proprietaire_id=auth.uid());
CREATE INDEX IF NOT EXISTS sms_tests_daily ON public.sms_test_envois(cree_le);
CREATE OR REPLACE FUNCTION public.reserver_test_sms(p_id uuid,p_empreinte text,p_segments integer,p_fin text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v public.sms_test_envois; used integer; attempts integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.sms_test_autorisations WHERE proprietaire_id=auth.uid()) THEN RAISE EXCEPTION 'Compte non autorisé aux tests Twilio'; END IF;
 IF p_id IS NULL OR p_empreinte IS NULL OR p_empreinte !~ '^[a-f0-9]{64}$' OR p_segments IS NULL OR p_segments NOT BETWEEN 1 AND 3 OR p_fin IS NULL OR p_fin !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'Test invalide'; END IF;
 -- Serialize all test reservations, across owners and server instances.
 PERFORM pg_catalog.pg_advisory_xact_lock(260026,1);
 SELECT * INTO v FROM public.sms_test_envois WHERE id=p_id;
 IF FOUND THEN
  IF v.proprietaire_id<>auth.uid() OR v.empreinte<>p_empreinte THEN RAISE EXCEPTION 'Identifiant déjà utilisé'; END IF;
  RETURN jsonb_build_object('created',false,'record',to_jsonb(v));
 END IF;
 SELECT coalesce(sum(segments),0),count(*) FILTER(WHERE proprietaire_id=auth.uid()) INTO used,attempts FROM public.sms_test_envois WHERE cree_le>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
 IF used+p_segments>20 OR attempts>=5 THEN RAISE EXCEPTION 'Quota quotidien de tests atteint'; END IF;
 INSERT INTO public.sms_test_envois(id,proprietaire_id,empreinte,segments,destinataire_fin) VALUES(p_id,auth.uid(),p_empreinte,p_segments,p_fin) RETURNING * INTO v;
 RETURN jsonb_build_object('created',true,'record',to_jsonb(v));
END $$;
REVOKE ALL ON FUNCTION public.reserver_test_sms(uuid,text,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reserver_test_sms(uuid,text,integer,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.enregistrer_resultat_test_sms(p_id uuid,p_statut text,p_sid text,p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v public.sms_test_envois;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.sms_test_autorisations WHERE proprietaire_id=auth.uid()) THEN RAISE EXCEPTION 'Compte non autorisé aux tests Twilio'; END IF;
 IF p_statut IS NULL OR p_statut NOT IN ('unknown','accepted','scheduled','queued','sending','sent','delivered','undelivered','failed','canceled') OR (p_sid IS NOT NULL AND p_sid !~ '^SM[a-fA-F0-9]{32}$') OR (p_code IS NOT NULL AND p_code !~ '^[0-9]{1,8}$') THEN RAISE EXCEPTION 'Résultat invalide'; END IF;
 SELECT * INTO v FROM public.sms_test_envois WHERE id=p_id AND proprietaire_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Test introuvable'; END IF;
 IF v.twilio_sid IS NOT NULL AND v.twilio_sid IS DISTINCT FROM p_sid THEN RAISE EXCEPTION 'Référence Twilio différente'; END IF;
 UPDATE public.sms_test_envois SET statut=p_statut,twilio_sid=p_sid,code_erreur=p_code WHERE id=p_id RETURNING * INTO v;
 RETURN to_jsonb(v);
END $$;
REVOKE ALL ON FUNCTION public.enregistrer_resultat_test_sms(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.enregistrer_resultat_test_sms(uuid,text,text,text) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
