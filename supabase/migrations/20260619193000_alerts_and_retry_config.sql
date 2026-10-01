-- Add retry and connection check configuration to app_settings, profiles, and surveys
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS retry_interval_hours INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS last_connection_check_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_connection_check_status TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

-- Recarregar o cache do PostgREST para API
NOTIFY pgrst, 'reload schema';
