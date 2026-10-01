
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
