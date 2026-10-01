-- Add min_score and max_score to message_templates for custom rating ranges
ALTER TABLE public.message_templates
ADD COLUMN IF NOT EXISTS min_score integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_score integer DEFAULT NULL;

COMMENT ON COLUMN public.message_templates.min_score IS 'Nota mínima abrangida pelo modelo de resposta';
COMMENT ON COLUMN public.message_templates.max_score IS 'Nota máxima abrangida pelo modelo de resposta';
