BEGIN;
CREATE TABLE IF NOT EXISTS public.account_recovery_settings (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 recovery_email text,
 pending_email text,
 confirmation_hash text UNIQUE,
 confirmation_expires_at timestamptz,
 last_confirmation_sent_at timestamptz,
 last_recovery_sent_at timestamptz
);
ALTER TABLE public.account_recovery_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_recovery_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_recovery_settings TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_recovery_confirmation(p_user uuid,p_email text,p_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_hash !~ '^[a-f0-9]{64}$' OR length(p_email)>254 OR p_email NOT LIKE '%@%' THEN RAISE EXCEPTION 'Données invalides'; END IF;
 INSERT INTO public.account_recovery_settings(user_id,pending_email,confirmation_hash,confirmation_expires_at,last_confirmation_sent_at)
 VALUES(p_user,lower(p_email),p_hash,now()+interval '30 minutes',now())
 ON CONFLICT(user_id) DO UPDATE SET pending_email=excluded.pending_email,confirmation_hash=excluded.confirmation_hash,
 confirmation_expires_at=excluded.confirmation_expires_at,last_confirmation_sent_at=now()
 WHERE account_recovery_settings.last_confirmation_sent_at IS NULL OR account_recovery_settings.last_confirmation_sent_at<now()-interval '2 minutes';
 RETURN FOUND;
END $$;
CREATE OR REPLACE FUNCTION public.reserve_password_recovery(p_login_email text)
RETURNS TABLE(user_id uuid,login_email text,recipient text) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target_id uuid; target_email text;
BEGIN
 SELECT u.id,u.email INTO target_id,target_email FROM auth.users u WHERE lower(u.email)=lower(p_login_email) AND u.email_confirmed_at IS NOT NULL AND u.deleted_at IS NULL;
 IF target_id IS NULL THEN RETURN; END IF;
 INSERT INTO public.account_recovery_settings(user_id) VALUES(target_id) ON CONFLICT ON CONSTRAINT account_recovery_settings_pkey DO NOTHING;
 RETURN QUERY UPDATE public.account_recovery_settings s SET last_recovery_sent_at=now()
 WHERE s.user_id=target_id AND (s.last_recovery_sent_at IS NULL OR s.last_recovery_sent_at<now()-interval '2 minutes')
 RETURNING s.user_id,target_email,coalesce(s.recovery_email,target_email);
END $$;
REVOKE ALL ON FUNCTION public.reserve_recovery_confirmation(uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reserve_password_recovery(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_recovery_confirmation(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_password_recovery(text) TO service_role;
COMMIT;
