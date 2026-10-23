import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth, assertRoles } from "@/integrations/supabase/auth-middleware";
import {
  findScoreOverlap,
  getTemplateScoreRange,
  getBaseType,
  getNormalizedCategory,
  type MessageTemplateItem,
} from "./types";

const TemplateSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres"),
  body: z.string().trim().min(5, "Texto da mensagem deve ter no mínimo 5 caracteres"),
  type: z.string().default("inicial"),
  minScore: z.number().nullable().optional(),
  maxScore: z.number().nullable().optional(),
  isDefault: z.boolean().default(false),
  active: z.boolean().default(true),
  zenviaTemplateId: z.string().nullable().optional(),
});

function mapToDatabaseType(
  rawType: string,
  name?: string,
  minScore?: number | null,
  maxScore?: number | null,
): "pesquisa" | "resposta_boa" | "resposta_media" | "resposta_ruim" {
  const cat = getNormalizedCategory(rawType, name);

  if (cat === "inicial") {
    return "pesquisa";
  }

  if (cat === "sair") {
    return "resposta_ruim";
  }

  const min = minScore ?? 0;
  if (min >= 9) {
    return "resposta_boa";
  }
  if (min >= 7) {
    return "resposta_media";
  }
  return "resposta_ruim";
}

export const createMessageTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => TemplateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertRoles(context, ["admin", "operador"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const dbType = mapToDatabaseType(data.type, data.name, data.minScore, data.maxScore);

    if (data.isDefault) {
      await supabaseAdmin
        .from("message_templates")
        .update({ is_default: false })
        .eq("type", dbType);
    }

    const { data: row, error } = await supabaseAdmin
      .from("message_templates")
      .insert({
        name: data.name,
        body: data.body,
        type: dbType,
        is_default: data.isDefault,
        zenvia_template_id: dbType === "pesquisa" ? data.zenviaTemplateId || null : null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const updateMessageTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    TemplateSchema.extend({
      id: z.string().uuid("ID inválido"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRoles(context, ["admin", "operador"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const dbType = mapToDatabaseType(data.type, data.name, data.minScore, data.maxScore);

    if (data.isDefault) {
      await supabaseAdmin
        .from("message_templates")
        .update({ is_default: false })
        .eq("type", dbType)
        .neq("id", data.id);
    }

    const { error } = await supabaseAdmin
      .from("message_templates")
      .update({
        name: data.name,
        body: data.body,
        type: dbType,
        is_default: data.isDefault,
        zenvia_template_id: dbType === "pesquisa" ? data.zenviaTemplateId || null : null,
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleTemplateActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid("ID inválido"),
        active: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRoles(context, ["admin", "operador"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("message_templates")
      .update({ is_default: data.active })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true, active: data.active };
  });

export const deleteMessageTemplate = createServerFn({ method: "POST" })
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

    const { error } = await supabaseAdmin.from("message_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listZenviaTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { getZenviaConfig } = await import("@/core/config/zenvia.config");
    const zenvia = getZenviaConfig();
    if (!zenvia.token) return [];

    try {
      const res = await fetch("https://api.zenvia.com/v2/templates", {
        headers: {
          "X-API-TOKEN": zenvia.token,
        },
      });
      if (!res.ok) return [];
      const json = (await res.json()) as Array<{
        id: string;
        name: string;
        status?: string;
        components?: Array<{ type: string; text?: string }>;
      }>;
      if (!Array.isArray(json)) return [];

      return json
        .filter((t) => !t.status || t.status.toUpperCase() === "APPROVED")
        .map((t) => {
          const bodyComponent = t.components?.find((c) => c.type === "BODY");
          return {
            id: t.id,
            name: t.name,
            text: bodyComponent?.text || "",
          };
        });
    } catch (err) {
      console.warn("[Zenvia] Erro ao listar templates aprovados:", err);
      return [];
    }
  });
