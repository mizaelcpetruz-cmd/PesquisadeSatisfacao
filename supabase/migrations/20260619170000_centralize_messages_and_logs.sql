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

-- Drop policy if exists
DROP POLICY IF EXISTS "Admins can do everything on system_logs" ON public.system_logs;

-- Create policy for admins (supervisors)
CREATE POLICY "Admins can do everything on system_logs" ON public.system_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );
