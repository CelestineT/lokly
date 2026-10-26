BEGIN;
CREATE TABLE IF NOT EXISTS public.quittance_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 quittance_id uuid NOT NULL,
 proprietaire_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 token text NOT NULL UNIQUE,
 reference text NOT NULL UNIQUE,
 empreinte text NOT NULL,
 payload jsonb,
 public_snapshot jsonb NOT NULL,
 statut text NOT NULL DEFAULT 'valide' CHECK (statut IN ('valide','remplace','annule')),
 cree_le timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS quittance_version_active ON public.quittance_versions(quittance_id) WHERE statut='valide';
ALTER TABLE public.quittance_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quittance_versions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.emettre_version_quittance(p_quittance uuid,p_source jsonb,p_empreinte text,p_payload jsonb,p_public jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q public.quittances; v public.quittance_versions; t text;
BEGIN
 SELECT * INTO q FROM public.quittances WHERE id=p_quittance AND proprietaire_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Accès refusé'; END IF;
 IF to_jsonb(q) IS DISTINCT FROM p_source THEN RAISE EXCEPTION 'La quittance a changé. Rechargez-la.'; END IF;
 IF p_empreinte !~ '^[a-f0-9]{64}$' OR p_payload IS NULL OR p_public IS NULL THEN RAISE EXCEPTION 'Version invalide'; END IF;
 SELECT * INTO v FROM public.quittance_versions WHERE quittance_id=q.id AND statut='valide';
 IF FOUND AND v.empreinte=p_empreinte THEN
  RETURN jsonb_build_object('token',v.token,'reference',v.reference,'payload',v.payload);
 END IF;
 UPDATE public.quittance_versions SET statut='remplace' WHERE quittance_id=q.id AND statut='valide';
 t:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 INSERT INTO public.quittance_versions(quittance_id,proprietaire_id,token,reference,empreinte,payload,public_snapshot)
 VALUES(q.id,auth.uid(),t,'EK-'||upper(substr(t,1,16)),p_empreinte,p_payload,
 jsonb_build_object('mois',p_public->>'mois','date_signature',p_public->>'date_signature','total',p_public->'total','total_paye',p_public->'total_paye','montant_impaye',p_public->'montant_impaye')) RETURNING * INTO v;
 RETURN jsonb_build_object('token',v.token,'reference',v.reference,'payload',v.payload);
END $$;
REVOKE ALL ON FUNCTION public.emettre_version_quittance(uuid,jsonb,text,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.emettre_version_quittance(uuid,jsonb,text,jsonb,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.verifier_version_quittance(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v public.quittance_versions;
BEGIN
 IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN RETURN NULL; END IF;
 SELECT * INTO v FROM public.quittance_versions WHERE token=p_token;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF v.statut='annule' THEN RETURN jsonb_build_object('reference',v.reference,'statut',v.statut); END IF;
 RETURN v.public_snapshot||jsonb_build_object('reference',v.reference,'statut',v.statut,'cree_le',v.cree_le);
END $$;
REVOKE ALL ON FUNCTION public.verifier_version_quittance(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verifier_version_quittance(text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.invalider_versions_quittance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  UPDATE public.quittance_versions SET statut='annule',payload=NULL,public_snapshot='{}'::jsonb WHERE quittance_id=OLD.id;
  RETURN OLD;
 END IF;
 -- Sending status and bookkeeping do not change the contents of an issued document.
 IF (to_jsonb(NEW)-'envoyee'-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'envoyee'-'updated_at') THEN
  UPDATE public.quittance_versions SET statut='remplace' WHERE quittance_id=OLD.id AND statut='valide';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.invalider_versions_quittance() FROM PUBLIC;
DROP TRIGGER IF EXISTS quittance_versions_invalidation ON public.quittances;
CREATE TRIGGER quittance_versions_invalidation AFTER UPDATE OR DELETE ON public.quittances FOR EACH ROW EXECUTE FUNCTION public.invalider_versions_quittance();
COMMIT;
NOTIFY pgrst,'reload schema';
