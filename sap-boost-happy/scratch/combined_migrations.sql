-- Cleanup existing objects if they exist to prevent conflicts on rerun
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TABLE IF EXISTS public.survey_responses CASCADE;
DROP TABLE IF EXISTS public.system_logs CASCADE;
DROP TABLE IF EXISTS public.surveys CASCADE;
DROP TABLE IF EXISTS public.schedules CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.message_templates CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;


-- Roles enum
create type public.app_role as enum ('admin', 'operador');

-- updated_at helper
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles read all authenticated" on public.profiles for select to authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.update_updated_at_column();

-- user_roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "roles read all authenticated" on public.user_roles for select to authenticated using (true);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- New user trigger: create profile + assign role (admin if first user)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_first boolean;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  select count(*) = 0 into is_first from public.user_roles;
  insert into public.user_roles (user_id, role)
  values (new.id, case when is_first then 'admin'::public.app_role else 'operador'::public.app_role end);
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- message_templates
create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  body text not null,
  is_default boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.message_templates to authenticated;
grant all on public.message_templates to service_role;
alter table public.message_templates enable row level security;
create policy "templates read auth" on public.message_templates for select to authenticated using (true);
create policy "templates admin manage" on public.message_templates for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger trg_templates_updated before update on public.message_templates for each row execute function public.update_updated_at_column();

-- surveys
create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  sap_doc_entry integer not null,
  sap_doc_num integer,
  card_code text not null,
  card_name text,
  contact_name text,
  phone text not null,
  invoice_date date,
  invoice_total numeric(18,2),
  template_id uuid references public.message_templates(id) on delete set null,
  rendered_message text,
  status text not null default 'pending' check (status in ('pending','sent','failed','answered')),
  zenvia_message_id text,
  error_message text,
  score integer,
  comment text,
  sent_at timestamptz,
  answered_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index surveys_doc_entry_idx on public.surveys (sap_doc_entry);
create index surveys_phone_idx on public.surveys (phone);
create index surveys_status_idx on public.surveys (status);
grant select, insert, update, delete on public.surveys to authenticated;
grant all on public.surveys to service_role;
alter table public.surveys enable row level security;
create policy "surveys read auth" on public.surveys for select to authenticated using (true);
create policy "surveys insert auth" on public.surveys for insert to authenticated with check (true);
create policy "surveys update auth" on public.surveys for update to authenticated using (true);
create policy "surveys delete admin" on public.surveys for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
create trigger trg_surveys_updated before update on public.surveys for each row execute function public.update_updated_at_column();

-- survey_responses
create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid references public.surveys(id) on delete set null,
  phone text not null,
  raw_text text,
  parsed_score integer,
  payload jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.survey_responses to authenticated;
grant all on public.survey_responses to service_role;
alter table public.survey_responses enable row level security;
create policy "responses read auth" on public.survey_responses for select to authenticated using (true);

-- schedules
create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  enabled boolean not null default true,
  period text not null default 'yesterday' check (period in ('today','yesterday','last_7_days','this_month','last_month')),
  template_id uuid references public.message_templates(id) on delete set null,
  last_run_at timestamptz,
  last_run_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.schedules to authenticated;
grant all on public.schedules to service_role;
alter table public.schedules enable row level security;
create policy "schedules read auth" on public.schedules for select to authenticated using (true);
create policy "schedules admin manage" on public.schedules for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger trg_schedules_updated before update on public.schedules for each row execute function public.update_updated_at_column();

-- Seed default template
insert into public.message_templates (name, body, is_default)
values (
  'Pesquisa de Satisfação Padrão',
  'Olá {{nome}}! Sou da Petruz. Recebemos sua compra (NF {{numero_nf}}) e gostaríamos de saber: de 0 a 10, qual a chance de você nos indicar a um amigo? Responda apenas com um número de 0 a 10. Obrigado! 🙏',
  true
);



-- Restrict SECURITY DEFINER fn execution
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
-- authenticated still needs has_role for policies; it's stable and read-only, fine to keep
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

-- Tighten surveys policies (require authenticated user, not "true")
drop policy if exists "surveys insert auth" on public.surveys;
drop policy if exists "surveys update auth" on public.surveys;
create policy "surveys insert auth" on public.surveys for insert to authenticated with check (auth.uid() is not null);
create policy "surveys update auth" on public.surveys for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);



-- 1) Add status column to profiles for approval flow
alter table public.profiles
  add column if not exists status text not null default 'pending'
  check (status in ('pending','approved','rejected'));

-- Backfill existing users as approved
update public.profiles set status = 'approved' where status = 'pending';

-- 2) Allow admin (supervisor) to update any profile (status changes)
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update"
  on public.profiles for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 3) Allow admin to manage user_roles (assign/change roles)
drop policy if exists "user_roles admin manage" on public.user_roles;
create policy "user_roles admin manage"
  on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 4) Update handle_new_user: first user approved+admin, others pending+operador
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_first boolean;
begin
  select count(*) = 0 into is_first from public.user_roles;
  insert into public.profiles (id, email, full_name, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    case when is_first then 'approved' else 'pending' end
  );
  insert into public.user_roles (user_id, role)
  values (new.id, case when is_first then 'admin'::public.app_role else 'operador'::public.app_role end);
  return new;
end; $$;

-- 5) App settings singleton (SAP + Zenvia + webhook URLs)
create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  sap_sl_url text,
  sap_sl_company_db text,
  sap_sl_username text,
  sap_sl_password text,
  zenvia_api_token text,
  zenvia_from text,
  zenvia_webhook_url text,
  cron_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
grant select, insert, update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;

drop policy if exists "app_settings admin read" on public.app_settings;
drop policy if exists "app_settings admin write" on public.app_settings;
create policy "app_settings admin read"
  on public.app_settings for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "app_settings admin write"
  on public.app_settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists trg_app_settings_updated on public.app_settings;
create trigger trg_app_settings_updated before update on public.app_settings
  for each row execute function public.update_updated_at_column();

-- Ensure singleton row exists
insert into public.app_settings (id) values (1)
on conflict (id) do nothing;

-- 6) Helper: admin delete user role
drop policy if exists "user_roles self read" on public.user_roles;
create policy "user_roles self read"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
drop policy if exists "roles read all authenticated" on public.user_roles;


-- Disable supervisor approval for new users
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_first boolean;
begin
  select count(*) = 0 into is_first from public.user_roles;
  insert into public.profiles (id, email, full_name, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'approved'
  );
  insert into public.user_roles (user_id, role)
  values (new.id, case when is_first then 'admin'::public.app_role else 'operador'::public.app_role end);
  return new;
end; $$;


-- Add zenvia_template_id to message_templates
alter table public.message_templates
add column if not exists zenvia_template_id text;


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



-- Add environment columns to public.surveys and public.app_settings
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'test'
  CHECK (environment IN ('test', 'production'));

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS current_environment TEXT NOT NULL DEFAULT 'test'
  CHECK (current_environment IN ('test', 'production'));


-- Add company_logo_url to app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS company_logo_url TEXT DEFAULT '';


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


-- Grant write/manage access for schedules and templates to operador role
DROP POLICY IF EXISTS "schedules admin manage" ON public.schedules;
CREATE POLICY "schedules admin manage" ON public.schedules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

DROP POLICY IF EXISTS "templates admin manage" ON public.message_templates;
CREATE POLICY "templates admin manage" ON public.message_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));


-- Add retry and connection check configuration to app_settings, profiles, and surveys
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS retry_interval_hours INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS last_connection_check_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_connection_check_status TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

-- Recarregar o cache do PostgREST para API
NOTIFY pgrst, 'reload schema';


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

-- Recarregar cache da API
NOTIFY pgrst, 'reload schema';


-- Add blocked_subgroups to app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS blocked_subgroups TEXT[] NOT NULL DEFAULT '{}'::text[];

-- Recarregar cache da API
NOTIFY pgrst, 'reload schema';


-- Add custom_subgroups to app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS custom_subgroups JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Recarregar cache da API
NOTIFY pgrst, 'reload schema';


-- Migration to add email fallback features to surveys and app_settings

-- 1) Add email column to surveys
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 2) Add email template configuration columns to app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS email_template_subject TEXT DEFAULT 'Pesquisa de Satisfação Petruz',
  ADD COLUMN IF NOT EXISTS email_template_body TEXT DEFAULT '<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111;">
  <p>Olá <strong>{{nome_cliente}}</strong>,</p>
  <p>Agradecemos a sua preferência e confiança na Petruz!</p>
  <p>Para nos ajudar a aprimorar nosso atendimento, de 0 a 10, qual a probabilidade de você recomendar a Petruz a um amigo ou colega?</p>
  
  <table border="0" cellpadding="0" cellspacing="5" style="margin: 30px 0; width: 100%; text-align: center;">
    <tr>
      <td style="border-radius: 4px;" bgcolor="#dc2626"><a href="{{link_nota_0}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">0</a></td>
      <td style="border-radius: 4px;" bgcolor="#dc2626"><a href="{{link_nota_1}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">1</a></td>
      <td style="border-radius: 4px;" bgcolor="#ea580c"><a href="{{link_nota_2}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">2</a></td>
      <td style="border-radius: 4px;" bgcolor="#ea580c"><a href="{{link_nota_3}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">3</a></td>
      <td style="border-radius: 4px;" bgcolor="#eab308"><a href="{{link_nota_4}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">4</a></td>
      <td style="border-radius: 4px;" bgcolor="#eab308"><a href="{{link_nota_5}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">5</a></td>
      <td style="border-radius: 4px;" bgcolor="#eab308"><a href="{{link_nota_6}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">6</a></td>
      <td style="border-radius: 4px;" bgcolor="#84cc16"><a href="{{link_nota_7}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">7</a></td>
      <td style="border-radius: 4px;" bgcolor="#84cc16"><a href="{{link_nota_8}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">8</a></td>
      <td style="border-radius: 4px;" bgcolor="#16a34a"><a href="{{link_nota_9}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">9</a></td>
      <td style="border-radius: 4px;" bgcolor="#16a34a"><a href="{{link_nota_10}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">10</a></td>
    </tr>
  </table>

  <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
    Esta é uma pesquisa automática relacionada ao pedido #{{id_pedido}}. Sua opinião é de extrema importância para nós.
  </p>
</div>';

-- Populate defaults if row 1 exists
UPDATE public.app_settings
SET
  email_template_subject = COALESCE(email_template_subject, 'Pesquisa de Satisfação Petruz'),
  email_template_body = COALESCE(email_template_body, '<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111;">
  <p>Olá <strong>{{nome_cliente}}</strong>,</p>
  <p>Agradecemos a sua preferência e confiança na Petruz!</p>
  <p>Para nos ajudar a aprimorar nosso atendimento, de 0 a 10, qual a probabilidade de você recomendar a Petruz a um amigo ou colega?</p>
  
  <table border="0" cellpadding="0" cellspacing="5" style="margin: 30px 0; width: 100%; text-align: center;">
    <tr>
      <td style="border-radius: 4px;" bgcolor="#dc2626"><a href="{{link_nota_0}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">0</a></td>
      <td style="border-radius: 4px;" bgcolor="#dc2626"><a href="{{link_nota_1}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">1</a></td>
      <td style="border-radius: 4px;" bgcolor="#ea580c"><a href="{{link_nota_2}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">2</a></td>
      <td style="border-radius: 4px;" bgcolor="#ea580c"><a href="{{link_nota_3}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">3</a></td>
      <td style="border-radius: 4px;" bgcolor="#eab308"><a href="{{link_nota_4}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">4</a></td>
      <td style="border-radius: 4px;" bgcolor="#eab308"><a href="{{link_nota_5}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">5</a></td>
      <td style="border-radius: 4px;" bgcolor="#eab308"><a href="{{link_nota_6}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">6</a></td>
      <td style="border-radius: 4px;" bgcolor="#84cc16"><a href="{{link_nota_7}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">7</a></td>
      <td style="border-radius: 4px;" bgcolor="#84cc16"><a href="{{link_nota_8}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">8</a></td>
      <td style="border-radius: 4px;" bgcolor="#16a34a"><a href="{{link_nota_9}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">9</a></td>
      <td style="border-radius: 4px;" bgcolor="#16a34a"><a href="{{link_nota_10}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">10</a></td>
    </tr>
  </table>

  <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
    Esta é uma pesquisa automática relacionada ao pedido #{{id_pedido}}. Sua opinião é de extrema importância para nós.
  </p>
</div>')
WHERE id = 1;

-- 3) Drop old status check constraint if exists and add new one supporting 'sent_email'
ALTER TABLE public.surveys DROP CONSTRAINT IF EXISTS surveys_status_check;
ALTER TABLE public.surveys ADD CONSTRAINT surveys_status_check CHECK (status IN ('pending', 'sent', 'sent_email', 'failed', 'answered'));

-- Recarregar cache da API
NOTIFY pgrst, 'reload schema';


-- Migration to add SMTP configuration columns to app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS smtp_host TEXT,
  ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587,
  ADD COLUMN IF NOT EXISTS smtp_user TEXT,
  ADD COLUMN IF NOT EXISTS smtp_pass TEXT,
  ADD COLUMN IF NOT EXISTS smtp_from TEXT;

-- Recarregar cache da API do PostgREST
NOTIFY pgrst, 'reload schema';


