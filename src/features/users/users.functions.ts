import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth, assertAdmin } from "@/integrations/supabase/auth-middleware";
import type { UserItem } from "./types";

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserItem[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profilesRes, rolesRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, status, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);

    if (profilesRes.error) throw new Error(profilesRes.error.message);
    if (rolesRes.error) throw new Error(rolesRes.error.message);

    const profiles = profilesRes.data ?? [];
    const roles = rolesRes.data ?? [];
    const roleByUser = new Map<string, string[]>();
    for (const r of roles) {
      const arr = roleByUser.get(r.user_id as string) ?? [];
      arr.push(r.role as string);
      roleByUser.set(r.user_id as string, arr);
    }

    return (profiles ?? []).map((p) => {
      const rs = roleByUser.get(p.id as string) ?? [];
      return {
        id: p.id as string,
        email: p.email as string | null,
        fullName: p.full_name as string | null,
        status: ((p.status as "pending" | "approved" | "rejected") || "pending"),
        createdAt: p.created_at as string,
        role: rs.includes("admin") ? ("supervisor" as const) : ("operador" as const),
      };
    });
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        email: z.string().trim().email("E-mail inválido"),
        fullName: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres"),
        role: z.enum(["supervisor", "operador"]),
        password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
      },
    });

    if (error || !newUser.user) {
      throw new Error(error?.message ?? "Falha ao criar usuário na base de autenticação.");
    }

    const userId = newUser.user.id;

    // Insert or update user role
    const dbRole = data.role === "supervisor" ? "admin" : "operador";
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: dbRole });

    return { ok: true, userId };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid("ID de usuário inválido"),
        role: z.enum(["supervisor", "operador"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const dbRole = data.role === "supervisor" ? "admin" : "operador";
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);

    await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: dbRole });

    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid("ID de usuário inválido"),
        newPassword: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("profiles")
      .update({ require_password_change: true })
      .eq("id", data.userId);

    return { ok: true };
  });
