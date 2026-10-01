-- Add custom_subgroups to app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS custom_subgroups JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Recarregar cache da API
NOTIFY pgrst, 'reload schema';
