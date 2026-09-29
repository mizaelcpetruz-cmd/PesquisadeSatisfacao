/**
 * Zenvia WhatsApp Messaging Integration (Server-only).
 * Uses Zenvia API v2.
 */
import { getZenviaConfig } from "@/core/config/zenvia.config";
import type {
  SendWhatsAppTextOptions,
  SendWhatsAppTemplateOptions,
  ZenviaResponse,
} from "./zenvia.types";

async function getValidZenviaEnv() {
  const zenvia = getZenviaConfig();
  if (!zenvia.token || !zenvia.from) {
    throw new Error("Credenciais da API Zenvia WhatsApp não configuradas no servidor.");
  }
  return zenvia;
}

/**
 * Sends a plain-text WhatsApp message via Zenvia API.
 */
export async function sendWhatsAppText(opts: SendWhatsAppTextOptions): Promise<{ id: string }> {
  const env = await getValidZenviaEnv();
  const res = await fetch("https://api.zenvia.com/v2/channels/whatsapp/messages", {
    method: "POST",
    headers: {
      "X-API-TOKEN": env.token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.from,
      to: opts.to,
      contents: [{ type: "text", text: opts.text }],
    }),
  });

  const data = (await res.json().catch(() => ({}))) as ZenviaResponse;
  if (!res.ok || !data.id) {
    throw new Error(
      `Zenvia falhou (${res.status}): ${data.code ?? ""} ${data.message ?? JSON.stringify(data)}`,
    );
  }
  return { id: data.id };
}

/**
 * Replaces {{variable}} in templates safely.
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  if (!template) return "";
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v == null ? "" : String(v);
  });
}

/**
 * Sends a structured WhatsApp Template via Zenvia API.
 */
export async function sendWhatsAppTemplate(
  opts: SendWhatsAppTemplateOptions,
): Promise<{ id: string }> {
  const env = await getValidZenviaEnv();

  const cleanFields: Record<string, string> = {};
  for (const [key, val] of Object.entries(opts.fields)) {
    if (val != null) {
      cleanFields[key] = String(val);
    }
  }

  const res = await fetch("https://api.zenvia.com/v2/channels/whatsapp/messages", {
    method: "POST",
    headers: {
      "X-API-TOKEN": env.token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.from,
      to: opts.to,
      contents: [
        {
          type: "template",
          templateId: opts.templateId,
          fields: cleanFields,
        },
      ],
    }),
  });

  const data = (await res.json().catch(() => ({}))) as ZenviaResponse;
  if (!res.ok || !data.id) {
    throw new Error(
      `Zenvia falhou (${res.status}): ${data.code ?? ""} ${data.message ?? JSON.stringify(data)}`,
    );
  }
  return { id: data.id };
}

/**
 * Tests connection with Zenvia API.
 */
export async function testZenviaConnection(
  tokenOverride?: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const env = getZenviaConfig();
    const token = tokenOverride || env.token;
    if (!token) return { ok: false, message: "Token Zenvia não configurado." };

    const res = await fetch("https://api.zenvia.com/v2/templates", {
      headers: {
        "X-API-TOKEN": token,
      },
    });
    if (!res.ok) {
      return { ok: false, message: `Erro ao conectar Zenvia (${res.status})` };
    }
    return { ok: true, message: "Conexão com Zenvia WhatsApp ativa e comunicando." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
