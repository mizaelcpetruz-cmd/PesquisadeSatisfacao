import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth, assertRoles } from "@/integrations/supabase/auth-middleware";

const ScheduleCreateSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres"),
  period: z.string().min(1, "Período é obrigatório"),
  templateId: z.string().uuid("Selecione um modelo válido"),
  runTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Horário inválido (formato HH:MM)")
    .refine((val) => val >= "08:00" && val <= "18:00", {
      message: "O horário deve ser estritamente em horário comercial (entre 08:00 e 18:00).",
    }),
});

export const createSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ScheduleCreateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertRoles(context, ["admin", "operador"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("schedules")
      .insert({
        name: data.name,
        period: data.period,
        template_id: data.templateId,
        run_time: data.runTime,
        enabled: true,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const toggleSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid("ID inválido"),
        enabled: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRoles(context, ["admin", "operador"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("schedules")
      .update({ enabled: data.enabled })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateScheduleTime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid("ID inválido"),
        runTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/, "Horário inválido")
          .refine((val) => val >= "08:00" && val <= "18:00", {
            message: "O horário deve ser em horário comercial (entre 08:00 e 18:00).",
          }),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRoles(context, ["admin", "operador"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("schedules")
      .update({ run_time: data.runTime })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid("ID inválido"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRoles(context, ["admin", "operador"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("schedules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
