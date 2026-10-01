-- Add environment columns to public.surveys and public.app_settings
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'test'
  CHECK (environment IN ('test', 'production'));

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS current_environment TEXT NOT NULL DEFAULT 'test'
  CHECK (current_environment IN ('test', 'production'));
