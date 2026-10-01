-- Add bpl_id and bpl_name (branch/company name) to surveys
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS bpl_id INTEGER,
  ADD COLUMN IF NOT EXISTS bpl_name TEXT;

CREATE INDEX IF NOT EXISTS surveys_bpl_name_idx ON public.surveys (bpl_name);
CREATE INDEX IF NOT EXISTS surveys_bpl_id_idx ON public.surveys (bpl_id);
