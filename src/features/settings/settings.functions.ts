import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth, assertAdmin } from "@/integrations/supabase/auth-middleware";
import {
  testSapConnection,
  listSapSubgroups,
  syncSapGroupsAndSubgroups,
  fetchSapBpGroups,
} from "@/integrations/sap/sap-client.server";
import { testZenviaConnection } from "@/integrations/zenvia/zenvia.server";
import { testSmtpConnection } from "@/integrations/email/email.server";
import type { AppSettingsData, SystemLogEntry } from "./types";
import type { SapSubgroup, SapBpGroup } from "@/integrations/sap/sap.types";

export const getAppSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AppSettingsData> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return {
      thank_you_promoter: data?.thank_you_promoter ?? null,
      thank_you_detractor: data?.thank_you_detractor ?? null,
      retry_interval_hours: data?.retry_interval_hours ?? 24,
      max_retry_attempts: data?.max_retry_attempts ?? 3,
      blocked_subgroups: data?.blocked_subgroups ?? [],
      custom_subgroups: (data?.custom_subgroups as AppSettingsData["custom_subgroups"]) ?? [],
      email_template_subject: data?.email_template_subject ?? "Pesquisa de Satisfação Petruz",
      email_template_body: data?.email_template_body ?? "",
      current_environment: (data?.current_environment as "test" | "production") || "test",
    };
  });

const AppSettingsSchema = z.object({
  thank_you_promoter: z.string().nullable().optional(),
  thank_you_detractor: z.string().nullable().optional(),
  retry_interval_hours: z.number().int().min(1).max(168).default(24),
  max_retry_attempts: z.number().int().min(1).max(10).default(3),
  blocked_subgroups: z.array(z.string()).default([]),
  custom_subgroups: z.array(z.record(z.unknown())).optional().default([]),
  email_template_subject: z.string().min(1).default("Pesquisa de Satisfação Petruz"),
  email_template_body: z.string().default(""),
  current_environment: z.enum(["test", "production"]).default("test"),
});

export const saveAppSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => AppSettingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("app_settings")
      .update({
        thank_you_promoter: data.thank_you_promoter || null,
        thank_you_detractor: data.thank_you_detractor || null,
        retry_interval_hours: data.retry_interval_hours,
        max_retry_attempts: data.max_retry_attempts,
        blocked_subgroups: data.blocked_subgroups,
        custom_subgroups: data.custom_subgroups,
        email_template_subject: data.email_template_subject,
        email_template_body: data.email_template_body,
        current_environment: data.current_environment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSystemLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        level: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("system_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (data.level && data.level !== "all") {
      query = query.eq("level", data.level);
    }
    if (data.startDate) {
      query = query.gte("created_at", `${data.startDate}T00:00:00`);
    }
    if (data.endDate) {
      query = query.lte("created_at", `${data.endDate}T23:59:59`);
    }

    const { data: logs, error } = await query;
    if (error) throw new Error(error.message);
    return (logs ?? []) as unknown as SystemLogEntry[];
  });

export const logLogsExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        count: z.number(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        level: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("system_logs").insert({
      level: "info",
      category: "logs_export",
      message: `Exported ${data.count} log records`,
      user_id: userId,
      details: JSON.stringify({
        recordsExported: data.count,
        filters: {
          startDate: data.startDate,
          endDate: data.endDate,
          level: data.level,
        },
      }),
    });

    return { ok: true };
  });

export const testInfrastructureConnections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [sap, zenvia, smtp] = await Promise.all([
      testSapConnection(),
      testZenviaConnection(),
      testSmtpConnection(),
    ]);
    return { sap, zenvia, smtp };
  });

export const getSapSubgroupsList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    return await listSapSubgroups();
  });

export const getSapGroupsAndSubgroupsCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ groups: SapBpGroup[]; subgroups: SapSubgroup[] }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Load custom subgroups if already saved in app_settings
    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("custom_subgroups")
      .eq("id", 1)
      .maybeSingle();

    const custom = settings?.custom_subgroups as SapSubgroup[] | null;
    let subgroups: SapSubgroup[] = [];

    const { STATIC_SUBGROUPS } = await import("@/integrations/sap/sap-subgroups.data");
    const mergedMap = new Map<string, SapSubgroup>();

    // 1. Seed with authentic @CSG_LINHA subgroups
    for (const item of STATIC_SUBGROUPS) {
      mergedMap.set(item.Code, item);
    }

    // 2. Add custom/dynamic subgroups from Supabase if present
    if (custom && Array.isArray(custom)) {
      for (const item of custom) {
        if (item && item.Code) {
          mergedMap.set(item.Code, item);
        }
      }
    }

    subgroups = Array.from(mergedMap.values());



    // Build distinct groups list
    const groupMap = new Map<string, string>();
    for (const sg of subgroups) {
      if (sg.groupCode) {
        groupMap.set(sg.groupCode, sg.groupName || sg.Group || `Grupo ${sg.groupCode}`);
      }
    }

    const groups: SapBpGroup[] = Array.from(groupMap.entries())
      .map(([groupCode, groupName]) => ({ groupCode, groupName }))
      .sort((a, b) => a.groupName.localeCompare(b.groupName));

    return { groups, subgroups };
  });

export const syncSapSubgroupsFromSap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Fetch fresh groups and subgroups from SAP Service Layer
    const result = await syncSapGroupsAndSubgroups();

    // 2. Persist updated custom_subgroups in app_settings table
    const { error } = await supabaseAdmin
      .from("app_settings")
      .update({
        custom_subgroups: result.subgroups,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      console.error("[Settings] Erro ao persistir custom_subgroups no Supabase:", error);
    }

    return {
      ok: true,
      groupsCount: result.groups.length,
      subgroupsCount: result.subgroups.length,
      groups: result.groups,
      subgroups: result.subgroups,
    };
  });

