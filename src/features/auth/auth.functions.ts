import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { UserProfileAccess } from "./types";

export const getMyAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserProfileAccess> => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, status, require_password_change, phone")
      .eq("id", userId)
      .maybeSingle();

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roleList = (roles ?? []).map((r: { role: string }) => r.role);
    const isAdmin = roleList.includes("admin");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: appSettings } = await supabaseAdmin
      .from("app_settings")
      .select("current_environment")
      .eq("id", 1)
      .maybeSingle();

    return {
      userId,
      email: profile?.email ?? null,
      fullName: profile?.full_name ?? null,
      phone: profile?.phone ?? null,
      status: ((profile?.status as "pending" | "approved" | "rejected") || "pending"),
      role: isAdmin ? ("supervisor" as const) : ("operador" as const),
      requirePasswordChange: !!profile?.require_password_change,
      currentEnvironment: (appSettings?.current_environment as "test" | "production") || "test",
    };
  });

export const updateMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        newPassword: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("profiles")
      .update({ require_password_change: false })
      .eq("id", userId);

    return { ok: true };
  });

export const updateMyEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        newEmail: z.string().trim().email("E-mail inválido"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: data.newEmail,
      email_confirm: true,
    });
    if (authError) throw new Error(authError.message);

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ email: data.newEmail })
      .eq("id", userId);
    if (profileError) throw new Error(profileError.message);

    return { ok: true };
  });

export const updateMyProfileDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres"),
        phone: z.string().trim().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.fullName,
        phone: data.phone || null,
      })
      .eq("id", userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
