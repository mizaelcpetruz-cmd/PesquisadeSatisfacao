-- Add blocked_subgroups to app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS blocked_subgroups TEXT[] NOT NULL DEFAULT '{}'::text[];

-- Recarregar cache da API
NOTIFY pgrst, 'reload schema';
