import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  sendWhatsAppTemplate,
  sendWhatsAppText,
  renderTemplate,
} from "@/integrations/zenvia/zenvia.server";
import {
  isBusinessDay,
  isCommercialHour,
  getBrazilTimeString,
  getBrazilDateString,
} from "@/core/utils/date.utils";

export class SurveyRetryService {
  /**
   * Retries WhatsApp surveys marked as 'failed' based on configured retry interval and maximum attempts.
   */
  static async retryFailedSurveys(
    currentEnv: string,
    retryIntervalHours: number,
    maxRetryAttempts: number,
  ): Promise<void> {
    const now = new Date();
    const currentHourMin = getBrazilTimeString(now);

    // Validação de Regra de Negócio: Somente em dias úteis e horário comercial (08:00 às 18:00)
    if (!isBusinessDay(now) || !isCommercialHour(currentHourMin)) {
      console.log(
        `[SurveyRetryService] Fora do horário comercial (08:00 às 18:00 em dias úteis). Reenvios automáticos em pausa.`,
      );
      return;
    }

    console.log(
      "[SurveyRetryService] Verificando pesquisas falhas para reenvio automático via WhatsApp...",
    );

    try {
      const intervalMs = retryIntervalHours * 3600 * 1000;
      const retryCutoff = new Date(now.getTime() - intervalMs).toISOString();

      const { data: failedSurveys } = await supabaseAdmin
        .from("surveys")
        .select("*, message_templates(*)")
        .eq("status", "failed")
        .eq("environment", currentEnv)
        .lt("retry_count", maxRetryAttempts)
        .lte("updated_at", retryCutoff);

      if (!failedSurveys || failedSurveys.length === 0) {
        console.log("[SurveyRetryService] Nenhuma pesquisa elegível para reenvio no momento.");
        return;
      }

      console.log(
        `[SurveyRetryService] Reenviando ${failedSurveys.length} pesquisas com falha via WhatsApp.`,
      );

      for (const survey of failedSurveys) {
        const attempts = (survey.retry_count || 0) + 1;
        let success = false;
        let lastError = "";

        // Try WhatsApp if valid phone is available
        if (survey.phone && survey.phone !== "NÃO ENCONTRADO") {
          try {
            const template = survey.message_templates;
            const vars = {
              nome_cliente: survey.contact_name || survey.card_name || "",
              id_pedido: survey.id,
              nota_url: `https://pesquisa.petruz.com/api/public/nps/responder?pedido=${survey.id}&nota=`,
            };

            if (template?.zenvia_template_id) {
              const res = await sendWhatsAppTemplate({
                to: survey.phone,
                templateId: template.zenvia_template_id,
                fields: vars,
              });
              await supabaseAdmin
                .from("surveys")
                .update({
                  status: "sent",
                  zenvia_message_id: res.id,
                  retry_count: attempts,
                  updated_at: new Date().toISOString(),
                  error_message: null,
                })
                .eq("id", survey.id);
              success = true;
            } else if (template?.body) {
              const body = renderTemplate(template.body, vars);
              const res = await sendWhatsAppText({ to: survey.phone, text: body });
              await supabaseAdmin
                .from("surveys")
                .update({
                  status: "sent",
                  zenvia_message_id: res.id,
                  retry_count: attempts,
                  updated_at: new Date().toISOString(),
                  error_message: null,
                })
                .eq("id", survey.id);
              success = true;
            }
          } catch (wErr) {
            lastError = `Reenvio WhatsApp falhou: ${wErr instanceof Error ? wErr.message : String(wErr)}`;
          }
        } else {
          lastError = "Cliente sem telefone celular / WhatsApp cadastrado no SAP.";
        }

        // Update retry attempt if still failed
        if (!success) {
          await supabaseAdmin
            .from("surveys")
            .update({
              retry_count: attempts,
              updated_at: new Date().toISOString(),
              error_message: `Tentativa ${attempts}/${maxRetryAttempts} falhou: ${lastError}`,
            })
            .eq("id", survey.id);
        }
      }
    } catch (err) {
      console.error("[SurveyRetryService] Erro ao processar reenvios:", err);
    }
  }
}
