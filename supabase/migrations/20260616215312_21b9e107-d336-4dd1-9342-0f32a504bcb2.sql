
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
