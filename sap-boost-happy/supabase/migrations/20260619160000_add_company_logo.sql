-- Add company_logo_url to app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS company_logo_url TEXT DEFAULT '';
