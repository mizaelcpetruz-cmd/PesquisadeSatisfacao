-- Combined Pending Migrations (From 20260619170000 onwards)

-- =========================================================================
-- 1) 20260619170000_centralize_messages_and_logs.sql
-- =========================================================================

-- Add type column to message_templates
ALTER TABLE public.message_templates
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'pesquisa' CHECK (type IN ('pesquisa', 'resposta_boa', 'resposta_media', 'resposta_ruim'));

-- Create active reply templates from existing app_settings if they exist
INSERT INTO public.message_templates (id, name, body, type, is_default)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Resposta Automática — Bom (Notas 9-10)',
  COALESCE(thank_you_promoter, 'Muito obrigado pela sua resposta e pela excelente nota! Ficamos muito felizes em saber que teve uma boa experiência. 😊'),
  'resposta_boa',
  true
FROM public.app_settings
WHERE id = 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.message_templates (id, name, body, type, is_default)
SELECT
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Resposta Automática — Médio (Notas 7-8)',
  'Agradecemos o seu feedback! Trabalhamos constantemente para melhorar nossos serviços e sua opinião nos ajuda muito. 👍',
  'resposta_media',
  true
FROM public.app_settings
WHERE id = 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.message_templates (id, name, body, type, is_default)
SELECT
  '00000000-0000-0000-0000-000000000003'::uuid,
  'Resposta Automática — Ruim (Notas 0-6)',
  COALESCE(thank_you_detractor, 'Agradecemos o seu feedback! Lamentamos que sua experiência não tenha sido ideal e entraremos em contato para entender como podemos melhorar. 🙏'),
  'resposta_ruim',
  true
FROM public.app_settings
WHERE id = 1
ON CONFLICT (id) DO NOTHING;

-- Create system_logs table
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT timezone('UTC'::text, now()) NOT NULL,
  level TEXT NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  details TEXT
);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 2) 20260619184500_schedules_operador_access.sql
-- =========================================================================

-- Grant write/manage access for schedules and templates to operador role
DROP POLICY IF EXISTS "schedules admin manage" ON public.schedules;
CREATE POLICY "schedules admin manage" ON public.schedules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

DROP POLICY IF EXISTS "templates admin manage" ON public.message_templates;
CREATE POLICY "templates admin manage" ON public.message_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

-- =========================================================================
-- 3) 20260619193000_alerts_and_retry_config.sql
-- =========================================================================

-- Add retry and connection check configuration to app_settings, profiles, and surveys
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS retry_interval_hours INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS last_connection_check_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_connection_check_status TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

-- =========================================================================
-- 4) 20260619194500_audit_logs_and_retry_settings.sql
-- =========================================================================

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

-- =========================================================================
-- 5) 20260620101500_blocked_subgroups.sql
-- =========================================================================

-- Add blocked_subgroups to app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS blocked_subgroups TEXT[] NOT NULL DEFAULT '{}'::text[];

-- =========================================================================
-- 6) 20260620112000_add_custom_subgroups.sql
-- =========================================================================

-- Add custom_subgroups to app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS custom_subgroups JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Recarregar cache da API
NOTIFY pgrst, 'reload schema';
