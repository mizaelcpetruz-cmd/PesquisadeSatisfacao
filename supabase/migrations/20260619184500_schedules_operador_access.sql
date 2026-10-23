-- Grant write/manage access for schedules and templates to operador role
DROP POLICY IF EXISTS "schedules admin manage" ON public.schedules;
CREATE POLICY "schedules admin manage" ON public.schedules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

DROP POLICY IF EXISTS "templates admin manage" ON public.message_templates;
CREATE POLICY "templates admin manage" ON public.message_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));
