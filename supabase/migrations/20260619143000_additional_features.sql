-- Add fields to profiles, app_settings, schedules, and surveys
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS require_password_change BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS thank_you_promoter TEXT DEFAULT 'Muito obrigado pela sua resposta e pela excelente nota! Ficamos muito felizes em saber que teve uma boa experiência. 😊',
  ADD COLUMN IF NOT EXISTS thank_you_detractor TEXT DEFAULT 'Agradecemos o seu feedback! A sua opinião é muito importante para nos ajudar a melhorar continuamente. 🙏';

ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS run_time TEXT NOT NULL DEFAULT '09:00';

ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS salesperson_name TEXT;

-- Update existing settings row to populate default thank you messages if empty
UPDATE public.app_settings
SET
  thank_you_promoter = COALESCE(thank_you_promoter, 'Muito obrigado pela sua resposta e pela excelente nota! Ficamos muito felizes em saber que teve uma boa experiência. 😊'),
  thank_you_detractor = COALESCE(thank_you_detractor, 'Agradecemos o seu feedback! A sua opinião é muito importante para nos ajudar a melhorar continuamente. 🙏')
WHERE id = 1;

