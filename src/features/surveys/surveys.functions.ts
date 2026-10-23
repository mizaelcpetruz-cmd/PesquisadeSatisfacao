import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  sendWhatsAppText,
  sendWhatsAppTemplate,
  renderTemplate,
  buildTemplateVariables,
} from "@/integrations/zenvia/zenvia.server";
import { normalizePhone, validateAndFormatE164Mobile } from "@/core/utils/phone.utils";
import {
  isBusinessDay,
  isCommercialHour,
  getBrazilTimeString,
  getBrazilDateString,
  formatLocalizedDate,
  formatInvoiceDateUTC,
} from "@/core/utils/date.utils";

const SendSchema = z.object({
  templateId: z.string().uuid("Template ID inválido"),
  sales: z
    .array(
      z.object({
        docEntry: z.number(),
        docNum: z.number(),
        docDate: z.string(),
        cardCode: z.string(),
        cardName: z.string(),
        docTotal: z.number(),
        phone: z.string().nullable().optional(),
        contactName: z.string().nullable(),
        salespersonName: z.string().nullable().optional(),
        bplId: z.number().nullable().optional(),
        bplName: z.string().nullable().optional(),
        recebePesquisa: z.union([z.string(), z.number()]).nullable().optional(),
      }),
    )
    .min(1, "Selecione pelo menos uma venda para enviar.")
    .max(200, "Limite de 200 vendas por lote."),
});

export const sendSurveys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => SendSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Validação de Regra de Negócio: Dias Úteis e Horário Comercial (08:00 às 18:00) para todas as ocasiões
    const now = new Date();
    const currentHourMin = getBrazilTimeString(now);

    if (!isBusinessDay(now)) {
      throw new Error(
        `Disparos de pesquisas permitidos apenas em dias úteis (Segunda a Sexta-feira, exceto feriados nacionais). Data atual: ${getBrazilDateString(now)}.`,
      );
    }

    if (!isCommercialHour(currentHourMin)) {
      throw new Error(
        `Disparos de pesquisas permitidos apenas em horário comercial (08:00 às 18:00). Horário atual em Belém: ${currentHourMin}.`,
      );
    }

    const { data: template, error: tErr } = await supabaseAdmin
      .from("message_templates")
      .select("id, body, zenvia_template_id")
      .eq("id", data.templateId)
      .maybeSingle();
    if (tErr || !template) throw new Error("Modelo de mensagem não encontrado.");

    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("current_environment")
      .eq("id", 1)
      .maybeSingle();
    const currentEnv = settings?.current_environment || "test";

    const request = getRequest();
    let baseUrl = "";
    if (request) {
      try {
        const host =
          request.headers.get("x-forwarded-host") ||
          request.headers.get("host") ||
          "localhost:8080";
        const proto = request.headers.get("x-forwarded-proto") || "http";
        baseUrl = `${proto}://${host}`;
      } catch (err) {
        console.error("Erro ao obter baseUrl do request:", err);
      }
    }
    if (!baseUrl) {
      baseUrl = "http://localhost:8080";
    }

    const results: Array<{
      docEntry: number;
      docNum: number;
      ok: boolean;
      status: "sent" | "failed" | "already_sent" | "opt_out";
      error?: string;
    }> = [];

    for (const sale of data.sales) {
      // 1. Prevenção de Duplicadas (Checar se já foi enviado com sucesso)
      const { data: existing } = await supabaseAdmin
        .from("surveys")
        .select("id, status")
        .eq("sap_doc_entry", sale.docEntry)
        .in("status", ["sent", "answered"])
        .limit(1);

      if (existing && existing.length > 0) {
        results.push({
          docEntry: sale.docEntry,
          docNum: sale.docNum,
          ok: false,
          status: "already_sent",
          error: "Pesquisa já foi enviada anteriormente para esta Nota Fiscal.",
        });
        continue;
      }

      // 2. Respeito ao Consentimento do Cliente (Opt-Out: U_RecebePesquisa = 0)
      const recebePesquisa = sale.recebePesquisa != null ? String(sale.recebePesquisa).trim() : "1";
      if (recebePesquisa === "0") {
        results.push({
          docEntry: sale.docEntry,
          docNum: sale.docNum,
          ok: false,
          status: "opt_out",
          error: "Cliente optou por não receber pesquisas (Opt-Out).",
        });
        continue;
      }

      // 3. Sanitização e Validação Estrita do Telefone Celular (E.164 Brasil)
      const phoneValidation = validateAndFormatE164Mobile(sale.phone);

      if (!phoneValidation.valid || !phoneValidation.e164) {
        const errorDesc =
          phoneValidation.error || "Cliente sem telefone celular / WhatsApp válido no SAP.";
        console.log(`[sendSurveys] Telefone Inválido para NFe ${sale.docNum}: ${errorDesc}`);

        const failedPayload: Record<string, unknown> = {
          sap_doc_entry: sale.docEntry,
          sap_doc_num: sale.docNum,
          card_code: sale.cardCode,
          card_name: sale.cardName,
          contact_name: sale.contactName,
          phone: sale.phone || "NÃO ENCONTRADO",
          invoice_date: formatInvoiceDateUTC(sale.docDate),
          invoice_total: sale.docTotal,
          template_id: template.id,
          rendered_message: errorDesc,
          created_by: userId,
          status: "failed",
          error_message: `Telefone Inválido para NFe ${sale.docNum}: ${errorDesc}`,
          salesperson_name: sale.salespersonName ?? null,
          bpl_name: sale.bplName ?? null,
          bpl_id: sale.bplId ?? null,
          environment: currentEnv,
        };

        let fRes = await supabaseAdmin.from("surveys").insert(failedPayload as any);
        if (fRes.error && fRes.error.code === "PGRST204") {
          delete failedPayload.bpl_name;
          delete failedPayload.bpl_id;
          fRes = await supabaseAdmin.from("surveys").insert(failedPayload as any);
        }

        results.push({
          docEntry: sale.docEntry,
          docNum: sale.docNum,
          ok: false,
          status: "failed",
          error: errorDesc,
        });
        continue;
      }

      const recipientPhone = phoneValidation.e164;
      const formattedDate = formatLocalizedDate(sale.docDate);

      const templateVars = buildTemplateVariables({
        contactName: sale.contactName,
        cardName: sale.cardName,
        docNum: sale.docNum,
        formattedDate,
        salespersonName: sale.salespersonName,
      });

      const rendered = renderTemplate(template.body, templateVars);

      const surveyPayload: Record<string, unknown> = {
        sap_doc_entry: sale.docEntry,
        sap_doc_num: sale.docNum,
        card_code: sale.cardCode,
        card_name: sale.cardName,
        contact_name: templateVars.nome,
        phone: recipientPhone,
        invoice_date: formatInvoiceDateUTC(sale.docDate),
        invoice_total: sale.docTotal,
        template_id: template.id,
        rendered_message: rendered,
        created_by: userId,
        status: "pending",
        salesperson_name: sale.salespersonName ?? null,
        bpl_name: sale.bplName ?? null,
        bpl_id: sale.bplId ?? null,
        environment: currentEnv,
      };

      let { data: inserted, error: iErr } = await supabaseAdmin
        .from("surveys")
        .insert(surveyPayload as any)
        .select("id")
        .single();

      if (iErr && iErr.code === "PGRST204") {
        delete surveyPayload.bpl_name;
        delete surveyPayload.bpl_id;
        const retryInsert = await supabaseAdmin
          .from("surveys")
          .insert(surveyPayload as any)
          .select("id")
          .single();
        inserted = retryInsert.data;
        iErr = retryInsert.error;
      }

      if (iErr || !inserted) {
        console.error("Erro ao gravar pesquisa no Supabase:", iErr);
        results.push({
          docEntry: sale.docEntry,
          docNum: sale.docNum,
          ok: false,
          status: "failed",
          error: iErr?.message ?? "Falha ao gravar pesquisa",
        });
        continue;
      }

      const zenviaFields = buildTemplateVariables({
        contactName: sale.contactName,
        cardName: sale.cardName,
        docNum: sale.docNum,
        formattedDate,
        salespersonName: sale.salespersonName,
        surveyId: inserted.id,
        baseUrl,
      });

      try {
        if (template.zenvia_template_id) {
          const res = await sendWhatsAppTemplate({
            to: recipientPhone,
            templateId: template.zenvia_template_id,
            fields: zenviaFields,
          });

          await supabaseAdmin
            .from("surveys")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              zenvia_message_id: res.id,
            })
            .eq("id", inserted.id);

          results.push({ docEntry: sale.docEntry, docNum: sale.docNum, ok: true, status: "sent" });
        } else {
          const res = await sendWhatsAppText({
            to: recipientPhone,
            text: rendered,
          });

          await supabaseAdmin
            .from("surveys")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              zenvia_message_id: res.id,
            })
            .eq("id", inserted.id);

          results.push({ docEntry: sale.docEntry, docNum: sale.docNum, ok: true, status: "sent" });
        }
      } catch (wErr: unknown) {
        const wErrMsg = wErr instanceof Error ? wErr.message : String(wErr);
        await supabaseAdmin
          .from("surveys")
          .update({ status: "failed", error_message: wErrMsg })
          .eq("id", inserted.id);

        results.push({
          docEntry: sale.docEntry,
          docNum: sale.docNum,
          ok: false,
          status: "failed",
          error: wErrMsg,
        });
      }
    }

    return results;
  });

export const logCsvExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        count: z.number(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        statusFilter: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("system_logs").insert({
      level: "info",
      category: "surveys_export",
      message: `Exportação de ${data.count} pesquisas para CSV`,
      user_id: userId,
      details: JSON.stringify({
        recordsExported: data.count,
        filters: {
          from: data.dateFrom,
          to: data.dateTo,
          status: data.statusFilter,
        },
      }),
    });

    return { ok: true };
  });

const ResendSchema = z.object({
  surveyId: z.string().uuid("Survey ID inválido"),
});

/**
 * Re-fetches the latest phone from SAP for a failed survey and re-dispatches the WhatsApp survey.
 */
export const resendSurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ResendSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: survey, error: sErr } = await supabaseAdmin
      .from("surveys")
      .select("*, message_templates(id, body, zenvia_template_id)")
      .eq("id", data.surveyId)
      .maybeSingle();

    if (sErr || !survey) throw new Error("Pesquisa não encontrada.");

    // Validação de Regra de Negócio: Dias Úteis e Horário Comercial (08:00 às 18:00) para todas as ocasiões
    const now = new Date();
    const currentHourMin = getBrazilTimeString(now);

    if (!isBusinessDay(now)) {
      throw new Error(
        `Reenvio de pesquisas permitido apenas em dias úteis (Segunda a Sexta-feira, exceto feriados nacionais). Data atual: ${getBrazilDateString(now)}.`,
      );
    }

    if (!isCommercialHour(currentHourMin)) {
      throw new Error(
        `Reenvio de pesquisas permitido apenas em horário comercial (08:00 às 18:00). Horário atual em Belém: ${currentHourMin}.`,
      );
    }

    // Fetch fresh BP contact directly from SAP
    const { getBusinessPartnerContact, pickPhone } =
      await import("@/integrations/sap/sap-client.server");
    const bp = await getBusinessPartnerContact(survey.card_code, true);

    // Check opt-out
    if (bp?.U_RecebePesquisa === "0" || bp?.U_RecebePesquisa === 0) {
      throw new Error("Cliente optou por não receber pesquisas de satisfação (Opt-Out).");
    }

    const freshPhone = pickPhone(bp) || survey.phone;
    const phoneValidation = validateAndFormatE164Mobile(freshPhone);

    if (!phoneValidation.valid || !phoneValidation.e164) {
      const errorDesc =
        phoneValidation.error || "Cliente continua sem telefone celular / WhatsApp válido no SAP.";
      await supabaseAdmin
        .from("surveys")
        .update({
          phone: freshPhone || "NÃO ENCONTRADO",
          error_message: `Telefone Inválido para NFe ${survey.sap_doc_num}: ${errorDesc}`,
        })
        .eq("id", survey.id);
      throw new Error(errorDesc);
    }

    const recipientPhone = phoneValidation.e164;

    const template = survey.message_templates;
    if (!template) throw new Error("Modelo de mensagem associado não encontrado.");

    const request = getRequest();
    let baseUrl = "http://localhost:8080";
    if (request) {
      try {
        const host =
          request.headers.get("x-forwarded-host") ||
          request.headers.get("host") ||
          "localhost:8080";
        const proto = request.headers.get("x-forwarded-proto") || "http";
        baseUrl = `${proto}://${host}`;
      } catch (err) {
        console.error("Erro ao obter baseUrl:", err);
      }
    }

    const templateVars = buildTemplateVariables({
      contactName: survey.contact_name,
      cardName: survey.card_name,
      docNum: survey.sap_doc_num,
      formattedDate: survey.invoice_date,
      salespersonName: survey.salesperson_name,
      surveyId: survey.id,
      baseUrl,
    });

    const rendered = renderTemplate(template.body, templateVars);

    try {
      if (template.zenvia_template_id) {
        const res = await sendWhatsAppTemplate({
          to: recipientPhone,
          templateId: template.zenvia_template_id,
          fields: templateVars,
        });

        await supabaseAdmin
          .from("surveys")
          .update({
            status: "sent",
            phone: recipientPhone,
            sent_at: new Date().toISOString(),
            zenvia_message_id: res.id,
            rendered_message: rendered,
            error_message: null,
          })
          .eq("id", survey.id);
      } else {
        const res = await sendWhatsAppText({
          to: recipientPhone,
          text: rendered,
        });

        await supabaseAdmin
          .from("surveys")
          .update({
            status: "sent",
            phone: recipientPhone,
            sent_at: new Date().toISOString(),
            zenvia_message_id: res.id,
            rendered_message: rendered,
            error_message: null,
          })
          .eq("id", survey.id);
      }

      // Propaga o telefone atualizado para todas as demais pesquisas deste mesmo cliente
      await supabaseAdmin
        .from("surveys")
        .update({ phone: recipientPhone })
        .eq("card_code", survey.card_code)
        .neq("id", survey.id);

      return { ok: true, phone: recipientPhone };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabaseAdmin
        .from("surveys")
        .update({
          phone: recipientPhone,
          error_message: msg,
        })
        .eq("id", survey.id);
      throw new Error(msg);
    }
  });

export const syncClientContactFromSap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ cardCode: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getBusinessPartnerContact, pickPhone } =
      await import("@/integrations/sap/sap-client.server");
    const bp = await getBusinessPartnerContact(data.cardCode, true);
    const rawPhone = pickPhone(bp);
    const contactName = bp?.ContactPerson ?? bp?.CardName ?? null;

    const validation = validateAndFormatE164Mobile(rawPhone);
    const phoneToSave = validation.e164 || rawPhone || "NÃO ENCONTRADO";

    // Atualiza em todas as pesquisas deste cliente no banco
    await supabaseAdmin
      .from("surveys")
      .update({
        phone: phoneToSave,
        contact_name: contactName,
      })
      .eq("card_code", data.cardCode);

    return {
      cardCode: data.cardCode,
      phone: phoneToSave,
      contactName,
      valid: validation.valid,
    };
  });

export const syncAllFailedContactsFromSap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        cardCodes: z.array(z.string()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { fetchBusinessPartnersBatch, pickPhone } =
      await import("@/integrations/sap/sap-client.server");

    let cardCodesToFetch = data.cardCodes?.filter(Boolean) || [];

    if (cardCodesToFetch.length === 0) {
      const { data: failedSurveys } = await supabaseAdmin
        .from("surveys")
        .select("card_code")
        .eq("status", "failed");

      cardCodesToFetch = Array.from(
        new Set((failedSurveys || []).map((s) => s.card_code).filter(Boolean)),
      ) as string[];
    }

    if (cardCodesToFetch.length === 0) {
      return { total: 0, updated: 0 };
    }

    // Busca contatos atualizados em lote direto do SAP (bypassing cache)
    const bpMap = await fetchBusinessPartnersBatch(cardCodesToFetch, 8, true);

    let updatedCount = 0;
    for (const [cardCode, bp] of bpMap.entries()) {
      const rawPhone = pickPhone(bp);
      const contactName = bp?.ContactPerson ?? bp?.CardName ?? null;
      const validation = validateAndFormatE164Mobile(rawPhone);
      const phoneToSave = validation.e164 || rawPhone || "NÃO ENCONTRADO";

      await supabaseAdmin
        .from("surveys")
        .update({
          phone: phoneToSave,
          contact_name: contactName,
        })
        .eq("card_code", cardCode);

      updatedCount++;
    }

    return { total: cardCodesToFetch.length, updated: updatedCount };
  });
