
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
