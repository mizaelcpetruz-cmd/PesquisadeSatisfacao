import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  listClosedInvoices,
  getBusinessPartnerContact,
  pickPhone,
} from "@/integrations/sap/sap-client.server";
import {
  sendWhatsAppText,
  sendWhatsAppTemplate,
  renderTemplate,
  buildTemplateVariables,
} from "@/integrations/zenvia/zenvia.server";
import {
  getBrazilDateString,
  formatInvoiceDateUTC,
  formatLocalizedDate,
  resolveDateRange,
  isBusinessDay,
  isCommercialHour,
  type Granularity,
} from "@/core/utils/date.utils";
import { validateAndFormatE164Mobile } from "@/core/utils/phone.utils";

export class SurveyProcessorService {
  /**
   * Processes all active scheduled survey routines (WhatsApp only).
   */
  static async processSchedules(
    currentEnv: string,
    blockedSubgroups: string[],
    maxRetryAttempts: number,
    baseUrl: string,
    currentHourMin: string,
  ): Promise<Array<{ schedule: string; sent: number; failed: number; error?: string }>> {
    console.log("[SurveyProcessorService] Processando rotinas de agendamento ativas (WhatsApp)...");
    const now = new Date();

    // 1. Somente em dias úteis (não disparam em finais de semana nem feriados nacionais)
    if (!isBusinessDay(now)) {
      console.log(
        `[SurveyProcessorService] Hoje (${getBrazilDateString(now)}) não é dia útil (final de semana ou feriado nacional). Agendamentos ignorados.`,
      );
      return [];
    }

    // 2. Somente em horário comercial (08:00 às 18:00)
    if (!isCommercialHour(currentHourMin)) {
      console.log(
        `[SurveyProcessorService] Horário atual (${currentHourMin}) fora do horário comercial (08:00 às 18:00). Agendamentos ignorados.`,
      );
      return [];
    }

    const { data: schedules } = await supabaseAdmin
      .from("schedules")
      .select("*, message_templates(id, body, zenvia_template_id)")
      .eq("enabled", true);

    const summary: Array<{ schedule: string; sent: number; failed: number; error?: string }> = [];

    const todayStr = getBrazilDateString(now);
    const [curYear, curMonth, curDay] = todayStr.split("-").map(Number);
    const curDateUTC = new Date(Date.UTC(curYear, curMonth - 1, curDay));
    const curDayOfWeek = curDateUTC.getUTCDay(); // 0 = Domingo, 1 = Segunda, ..., 5 = Sexta, 6 = Sábado

    for (const sch of schedules ?? []) {
      const runTime = (sch as { run_time?: string }).run_time || "09:00";
      
      // Se o horário configurado for fora do horário comercial, ignora
      if (!isCommercialHour(runTime)) {
        console.log(`[SurveyProcessorService] Agendamento "${sch.name}" possui horário não comercial (${runTime}). Ignorando.`);
        continue;
      }

      const alreadyRunToday =
        sch.last_run_at &&
        (() => {
          const lastRun = new Date(sch.last_run_at);
          return getBrazilDateString(lastRun) === todayStr;
        })();

      if (currentHourMin < runTime || alreadyRunToday) {
        continue;
      }

      const periodStr = (sch.period as string) || "day";

      // Verificação para agendamentos da semana vigente ("week:1" a "week:5" ou "week")
      if (periodStr.startsWith("week")) {
        let targetWeekday = 5; // Padrão: Sexta-feira
        if (periodStr.includes(":")) {
          targetWeekday = parseInt(periodStr.split(":")[1], 10);
        }
        if (curDayOfWeek !== targetWeekday) {
          // Não é o dia da semana configurado para envio
          continue;
        }
      }

      // Verificação para agendamentos do mês vigente ("month:1" a "month:31" ou "month")
      if (periodStr.startsWith("month")) {
        let targetMonthDay = 20; // Padrão dia 20
        if (periodStr.includes(":")) {
          targetMonthDay = parseInt(periodStr.split(":")[1], 10);
        }
        if (curDay !== targetMonthDay) {
          // Não é o dia do mês configurado para envio
          continue;
        }
      }

      console.log(`[SurveyProcessorService] Executando rotina agendada: "${sch.name}"...`);

      try {
        const { from, to } = resolveDateRange(periodStr as Granularity, todayStr);
        const invoices = await listClosedInvoices({ from, to });
        const tpl = (
          sch as { message_templates?: { body: string; zenvia_template_id?: string | null } | null }
        ).message_templates;

        if (!tpl) {
          summary.push({
            schedule: sch.name,
            sent: 0,
            failed: 0,
            error: "Sem modelo de mensagem configurado",
          });
          continue;
        }

        let sent = 0;
        let failed = 0;

        for (const inv of invoices) {
          const docIdent = inv.SequenceSerial ?? inv.DocNum;

          // 1. Prevenção de Duplicadas (Controle de Status no Supabase)
          const { data: existing } = await supabaseAdmin
            .from("surveys")
            .select("id")
            .eq("sap_doc_entry", inv.DocEntry)
            .in("status", ["sent", "answered"])
            .limit(1);

          if (existing && existing.length > 0) {
            continue;
          }

          // 2. Buscar informações do Parceiro de Negócios
          const bp = await getBusinessPartnerContact(inv.CardCode).catch(() => null);

          // 3. Regra de Consentimento do Cliente (LGPD / Opt-Out: U_RecebePesquisa = 0)
          const recebePesquisa =
            bp?.U_RecebePesquisa != null ? String(bp.U_RecebePesquisa).trim() : "1";
          if (recebePesquisa === "0") {
            console.log(
              `[SurveyProcessorService] [Opt-Out] Parceiro ${inv.CardCode} optou por não receber pesquisas (U_RecebePesquisa = 0). Ignorando envio para NFe ${docIdent}.`,
            );
            continue;
          }

          // 4. Regras de Subgrupos Bloqueados
          const bpSubgroup = bp?.U_Subgrupo?.trim() || "";
          const bpGroupCode =
            bp?.GroupCode !== undefined && bp?.GroupCode !== null
              ? String(bp.GroupCode).trim()
              : "";
          const isBlocked = blockedSubgroups.some((b: string) => {
            const parts = b.split(":");
            if (parts.length < 2) return false;
            const gCode = parts[0].trim();
            const subName = parts[1].trim();
            return gCode === bpGroupCode && subName.toLowerCase() === bpSubgroup.toLowerCase();
          });

          if (isBlocked) {
            console.log(
              `[SurveyProcessorService] Parceiro ${inv.CardCode} pertence ao subgrupo bloqueado "${bpSubgroup}". Ignorando NFe ${docIdent}.`,
            );
            continue;
          }

          const bplName =
            inv.BPLName ||
            (inv.BPL_IDAssignedToInvoice ? `Filial ${inv.BPL_IDAssignedToInvoice}` : null);

          // 5. Sanitização e Validação Estrita do Telefone Celular (E.164 Brasil)
          const rawPhone = pickPhone(bp);
          const phoneValidation = validateAndFormatE164Mobile(rawPhone);

          if (!phoneValidation.valid || !phoneValidation.e164) {
            const errorDesc =
              phoneValidation.error || "Cliente sem telefone celular / WhatsApp válido no SAP.";
            console.log(
              `[SurveyProcessorService] Telefone Inválido para NFe ${docIdent}: ${errorDesc}`,
            );

            const failedPayload: Record<string, unknown> = {
              sap_doc_entry: inv.DocEntry,
              sap_doc_num: docIdent,
              card_code: inv.CardCode,
              card_name: inv.CardName,
              contact_name: bp?.ContactPerson ?? null,
              phone: rawPhone || "NÃO ENCONTRADO",
              invoice_date: formatInvoiceDateUTC(inv.DocDate),
              invoice_total: Number(inv.DocTotal ?? 0),
              template_id: (sch as { template_id?: string }).template_id || null,
              rendered_message: errorDesc,
              status: "failed",
              error_message: `Telefone Inválido para NFe ${docIdent}: ${errorDesc}`,
              salesperson_name: inv.SalesPerson?.SalesEmployeeName ?? null,
              bpl_name: bplName ?? null,
              bpl_id: (inv.BPL_IDAssignedToInvoice as number) ?? null,
              environment: currentEnv,
              retry_count: maxRetryAttempts,
            };

            let fRes = await supabaseAdmin.from("surveys").insert(failedPayload as any);
            if (fRes.error && fRes.error.code === "PGRST204") {
              delete failedPayload.bpl_name;
              delete failedPayload.bpl_id;
              fRes = await supabaseAdmin.from("surveys").insert(failedPayload as any);
            }
            failed++;
            continue;
          }

          const phone = phoneValidation.e164;

          // 6. Mensagem validada -> Gravação e Disparo
          const templateVars = buildTemplateVariables({
            contactName: bp?.ContactPerson,
            cardName: inv.CardName,
            docNum: docIdent,
            formattedDate: formatLocalizedDate(inv.DocDate),
            salespersonName: inv.SalesPerson?.SalesEmployeeName,
          });

          const rendered = renderTemplate(tpl.body, templateVars);

          const surveyPayload: Record<string, unknown> = {
            sap_doc_entry: inv.DocEntry,
            sap_doc_num: docIdent,
            card_code: inv.CardCode,
            card_name: inv.CardName,
            contact_name: templateVars.nome,
            phone,
            invoice_date: formatInvoiceDateUTC(inv.DocDate),
            invoice_total: Number(inv.DocTotal ?? 0),
            template_id: (sch as { template_id?: string }).template_id || null,
            rendered_message: rendered,
            status: "pending",
            salesperson_name: inv.SalesPerson?.SalesEmployeeName ?? null,
            bpl_name: bplName ?? null,
            bpl_id: (inv.BPL_IDAssignedToInvoice as number) ?? null,
            environment: currentEnv,
          };

          let { data: row, error: rErr } = await supabaseAdmin
            .from("surveys")
            .insert(surveyPayload as any)
            .select("id")
            .single();

          if (rErr && rErr.code === "PGRST204") {
            delete surveyPayload.bpl_name;
            delete surveyPayload.bpl_id;
            const retryInsert = await supabaseAdmin
              .from("surveys")
              .insert(surveyPayload as any)
              .select("id")
              .single();
            row = retryInsert.data;
            rErr = retryInsert.error;
          }

          if (rErr || !row) {
            console.error("[SurveyProcessorService] Erro ao criar registro de pesquisa:", rErr);
            failed++;
            continue;
          }

          const zenviaFields = buildTemplateVariables({
            contactName: bp?.ContactPerson,
            cardName: inv.CardName,
            docNum: docIdent,
            formattedDate: formatLocalizedDate(inv.DocDate),
            salespersonName: inv.SalesPerson?.SalesEmployeeName,
            surveyId: row.id,
            baseUrl,
          });

          try {
            if (tpl.zenvia_template_id) {
              const res = await sendWhatsAppTemplate({
                to: phone,
                templateId: tpl.zenvia_template_id,
                fields: zenviaFields,
              });

              await supabaseAdmin
                .from("surveys")
                .update({
                  status: "sent",
                  sent_at: new Date().toISOString(),
                  zenvia_message_id: res.id,
                })
                .eq("id", row.id);

              sent++;
            } else {
              const res = await sendWhatsAppText({ to: phone, text: rendered });
              await supabaseAdmin
                .from("surveys")
                .update({
                  status: "sent",
                  sent_at: new Date().toISOString(),
                  zenvia_message_id: res.id,
                })
                .eq("id", row.id);

              sent++;
            }
          } catch (wErr) {
            console.warn(`[SurveyProcessorService] WhatsApp falhou para NF ${docIdent}:`, wErr);
            await supabaseAdmin
              .from("surveys")
              .update({
                status: "failed",
                error_message: wErr instanceof Error ? wErr.message : String(wErr),
              })
              .eq("id", row.id);
            failed++;
          }
        }

        // Update last_run_at timestamp on schedule
        await supabaseAdmin
          .from("schedules")
          .update({ last_run_at: now.toISOString() })
          .eq("id", sch.id);

        summary.push({ schedule: sch.name, sent, failed });
      } catch (err) {
        console.error(`[SurveyProcessorService] Erro ao processar agendamento "${sch.name}":`, err);
        summary.push({
          schedule: sch.name,
          sent: 0,
          failed: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return summary;
  }
}
