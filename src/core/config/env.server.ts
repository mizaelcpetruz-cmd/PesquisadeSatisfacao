import { z } from "zod";

/**
 * Server Environment Variables Schema.
 * Validates and strictly types all server-side environment variables at runtime.
 */
const ServerEnvSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v ? Number(v) : 8080)),
  DISABLE_ALERTS: z
    .string()
    .optional()
    .transform((val) => val === "true" || val === "1"),

  // Supabase Configuration
  SUPABASE_URL: z.string().url("SUPABASE_URL deve ser uma URL válida"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY é obrigatória"),
  SUPABASE_PUBLISHABLE_KEY: z.string().optional(),

  // Cron / Security Webhook Secret
  CRON_SECRET: z.string().optional(),

  // Email / SMTP Configuration
  SMTP_HOST: z.string().min(1, "SMTP_HOST não configurado"),
  SMTP_PORT: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v) || 587)
    .pipe(z.number().int().min(1).max(65535)),
  SMTP_USER: z.string().min(1, "SMTP_USER não configurado"),
  SMTP_PASS: z.string().min(1, "SMTP_PASS não configurado"),
  SMTP_FROM: z.string().min(1, "SMTP_FROM não configurado"),

  // SAP Business One Service Layer
  SAP_SL_URL: z.string().url("SAP_SL_URL deve ser uma URL válida").optional().or(z.literal("")),
  SAP_SL_COMPANY_DB: z.string().optional().default(""),
  SAP_SL_USERNAME: z.string().optional().default(""),
  SAP_SL_PASSWORD: z.string().optional().default(""),

  // Zenvia WhatsApp API
  ZENVIA_API_TOKEN: z.string().optional().default(""),
  ZENVIA_FROM: z.string().optional().default(""),
  ZENVIA_WEBHOOK_SECRET: z.string().optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function getServerEnv(): ServerEnv {
  const result = ServerEnvSchema.safeParse(process.env);
  if (result.success) {
    return result.data;
  }

  return ServerEnvSchema.parse({
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: process.env.PORT || 8080,
    DISABLE_ALERTS: process.env.DISABLE_ALERTS,
    SUPABASE_URL: process.env.SUPABASE_URL || "https://placeholder.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder",
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    SMTP_HOST: process.env.SMTP_HOST || "email-ssl.com.br",
    SMTP_PORT: process.env.SMTP_PORT || 465,
    SMTP_USER: process.env.SMTP_USER || "",
    SMTP_PASS: process.env.SMTP_PASS || "",
    SMTP_FROM: process.env.SMTP_FROM || "pesquisa@petruz.com",
    SAP_SL_URL: process.env.SAP_SL_URL || "",
    SAP_SL_COMPANY_DB: process.env.SAP_SL_COMPANY_DB || "",
    SAP_SL_USERNAME: process.env.SAP_SL_USERNAME || "",
    SAP_SL_PASSWORD: process.env.SAP_SL_PASSWORD || "",
    ZENVIA_API_TOKEN: process.env.ZENVIA_API_TOKEN || "",
    ZENVIA_FROM: process.env.ZENVIA_FROM || "",
    ZENVIA_WEBHOOK_SECRET: process.env.ZENVIA_WEBHOOK_SECRET,
  }) as ServerEnv;
}
