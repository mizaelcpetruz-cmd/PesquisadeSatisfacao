import { createFileRoute } from "@tanstack/react-router";
import crypto from "crypto";
import { LogCleanupService } from "@/server/services/log-cleanup.service";
import { ConnectionCheckService } from "@/server/services/connection-check.service";
import { SurveyRetryService } from "@/server/services/survey-retry.service";
import { SurveyProcessorService } from "@/server/services/survey-processor.service";
import { getBrazilTimeString } from "@/core/utils/date.utils";

/**
 * Public cron endpoint. Configure pg_cron (or external scheduler) to POST here.
 * Auth: requires `apikey` or `x-cron-key` header with timing-safe comparison.
 */
function isAuthorizedKey(providedKey: string | null): boolean {
  if (!providedKey) return false;
  const expectedKey = process.env.CRON_SECRET || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!expectedKey) return false;

  try {
    const a = Buffer.from(providedKey);
    const b = Buffer.from(expectedKey);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/cron/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey") || request.headers.get("x-cron-key");
        if (!isAuthorizedKey(key)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Limpeza automática de logs antigos do sistema (manter no máximo 90 dias)
        await LogCleanupService.cleanOldLogs();

        console.log("[CRON] Execução de rotinas do sistema iniciada.");
        const currentHourMin = getBrazilTimeString();

        // Carregar configurações do app
        const { data: appSettings } = await supabaseAdmin
          .from("app_settings")
          .select("*")
          .eq("id", 1)
          .maybeSingle();

        type AppSettingsDataRow = {
          current_environment?: string | null;
          retry_interval_hours?: number | null;
          max_retry_attempts?: number | null;
          blocked_subgroups?: string[] | null;
          email_template_subject?: string | null;
          email_template_body?: string | null;
        };

        const appSettingsRow = (appSettings || {
          current_environment: "test",
          retry_interval_hours: 24,
          max_retry_attempts: 3,
          blocked_subgroups: [],
          email_template_subject: "Pesquisa de Satisfação Petruz",
          email_template_body: "",
        }) as AppSettingsDataRow;

        const currentEnv = appSettingsRow.current_environment || "test";
        const retryIntervalHours = appSettingsRow.retry_interval_hours ?? 24;
        const maxRetryAttempts = appSettingsRow.max_retry_attempts ?? 3;
        const blockedSubgroups = appSettingsRow.blocked_subgroups || [];
        const emailSubject =
          appSettingsRow.email_template_subject || "Pesquisa de Satisfação Petruz";
        const emailBodyRaw = appSettingsRow.email_template_body || "";
        const baseUrl = new URL(request.url).origin;

        // 2. REGRA: Teste de Conexão Diário (notifica supervisores via e-mail se houver falha de infraestrutura)
        await ConnectionCheckService.checkAllConnections();

        // 3. REGRA: Reenvio de Pesquisas Falhas via WhatsApp
        await SurveyRetryService.retryFailedSurveys(
          currentEnv,
          retryIntervalHours,
          maxRetryAttempts,
        );

        // 4. Execução dos agendamentos diários ativos (WhatsApp)
        const summary = await SurveyProcessorService.processSchedules(
          currentEnv,
          blockedSubgroups,
          maxRetryAttempts,
          baseUrl,
          currentHourMin,
        );

        console.log(
          `[CRON] Cron finalizado com sucesso. Envios WhatsApp: ${summary.reduce((acc, curr) => acc + curr.sent, 0)} sucesso, ${summary.reduce((acc, curr) => acc + curr.failed, 0)} falha.`,
        );

        return Response.json({ ok: true, summary });
      },
    },
  },
});
