-- Add max_retry_attempts to app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS max_retry_attempts INTEGER NOT NULL DEFAULT 3;

-- Add user context columns to system_logs for auditing
ALTER TABLE public.system_logs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Update RLS policies for system_logs to allow any authenticated user to log, but only admins to read/manage
DROP POLICY IF EXISTS "Admins can do everything on system_logs" ON public.system_logs;

CREATE POLICY "Authenticated users can insert system_logs" ON public.system_logs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can read/manage system_logs" ON public.system_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Recarregar cache da API
NOTIFY pgrst, 'reload schema';
