-- Migration to add SMTP configuration columns to app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS smtp_host TEXT,
  ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587,
  ADD COLUMN IF NOT EXISTS smtp_user TEXT,
  ADD COLUMN IF NOT EXISTS smtp_pass TEXT,
  ADD COLUMN IF NOT EXISTS smtp_from TEXT;

-- Recarregar cache da API do PostgREST
NOTIFY pgrst, 'reload schema';
