-- Add zenvia_template_id to message_templates
alter table public.message_templates
add column if not exists zenvia_template_id text;
