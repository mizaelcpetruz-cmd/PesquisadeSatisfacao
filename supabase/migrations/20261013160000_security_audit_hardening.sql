-- ==============================================================================
-- Security Hardening Migration — Petruz Pesquisa de Satisfação
-- Addresses findings from the Security Audit Report (09/10/2026):
-- 3.1 (RLS surveys), 3.2 (profiles), 3.3 (handle_new_user), 3.4 (NPS response token),
-- 3.7 (app_settings secrets), 3.10 (system_logs RLS)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SURVEYS: Cryptographic response_token and RLS hardening
-- ------------------------------------------------------------------------------
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS response_token TEXT;

-- Generate random cryptographically secure token for existing rows
UPDATE public.surveys
SET response_token = encode(gen_random_bytes(24), 'hex')
WHERE response_token IS NULL;

-- Enforce default generation for new rows
ALTER TABLE public.surveys
  ALTER COLUMN response_token SET DEFAULT encode(gen_random_bytes(24), 'hex');

CREATE UNIQUE INDEX IF NOT EXISTS surveys_response_token_idx ON public.surveys (response_token);

-- Revoke direct mutation permissions from client roles (all writes use service_role)
REVOKE INSERT, UPDATE, DELETE ON public.surveys FROM authenticated;
REVOKE ALL ON public.surveys FROM anon;

DROP POLICY IF EXISTS "surveys insert auth" ON public.surveys;
DROP POLICY IF EXISTS "surveys update auth" ON public.surveys;
DROP POLICY IF EXISTS "surveys read auth" ON public.surveys;
DROP POLICY IF EXISTS "surveys delete admin" ON public.surveys;
DROP POLICY IF EXISTS "surveys read staff" ON public.surveys;

-- Only staff (admin or operador) can read surveys
CREATE POLICY "surveys read staff" ON public.surveys
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador')
  );

-- ------------------------------------------------------------------------------
-- 2. PROFILES: Prevent privilege escalation on status & require_password_change
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- If not an administrator, prevent altering security flags directly
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.status := OLD.status;
    NEW.require_password_change := OLD.require_password_change;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_fields();

DROP POLICY IF EXISTS "profiles update own" ON public.profiles;
CREATE POLICY "profiles update own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles read all authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles read authenticated" ON public.profiles;
CREATE POLICY "profiles read authenticated" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'operador')
  );

-- ------------------------------------------------------------------------------
-- 3. HANDLE_NEW_USER: Revert automatic approval (require admin review)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  SELECT count(*) = 0 INTO is_first FROM public.user_roles;
  
  -- The very first user is approved + admin (bootstrap).
  -- All subsequent users start as 'pending' with no role until an admin approves.
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE WHEN is_first THEN 'approved' ELSE 'pending' END
  );

  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role);
  END IF;

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. SYSTEM_LOGS: Prevent client SDK injection of arbitrary audit logs
-- ------------------------------------------------------------------------------
REVOKE INSERT ON public.system_logs FROM authenticated;
REVOKE INSERT ON public.system_logs FROM anon;

DROP POLICY IF EXISTS "Authenticated users can insert system_logs" ON public.system_logs;

-- ------------------------------------------------------------------------------
-- 5. APP_SETTINGS: Clear plaintext secrets & allow staff to read public settings
-- ------------------------------------------------------------------------------
UPDATE public.app_settings
SET
  sap_sl_password = NULL,
  zenvia_api_token = NULL,
  smtp_pass = NULL
WHERE id = 1;

DROP POLICY IF EXISTS "app_settings admin read" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings staff read" ON public.app_settings;
CREATE POLICY "app_settings staff read" ON public.app_settings
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador')
  );

-- ------------------------------------------------------------------------------
-- 6. Reload schema cache for PostgREST
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
