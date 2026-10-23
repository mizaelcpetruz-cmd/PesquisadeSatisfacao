import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  listClosedInvoices,
  fetchBusinessPartnersBatch,
  getBusinessPartnerContact,
  clearBpContactCache,
  pickPhone,
  pickEmail,
} from "@/integrations/sap/sap-client.server";
import { formatInvoiceDateUTC } from "@/core/utils/date.utils";
import type { InvoiceListItem, SaleRow } from "@/integrations/sap/sap.types";

const RangeSchema = z.object({
  from: z.string(),
  to: z.string(),
  forceFresh: z.boolean().optional(),
});

export const fetchClosedSales = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => RangeSchema.parse(input))
  .handler(async ({ data }): Promise<SaleRow[]> => {
    if (data.forceFresh) {
      clearBpContactCache();
    }

    // Special mode: Fetch invoices that had dispatch failures in the past
    if (data.from === "failed" || data.to === "failed") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: settings } = await supabaseAdmin
        .from("app_settings")
        .select("current_environment")
        .eq("id", 1)
        .maybeSingle();
      const currentEnv = settings?.current_environment || "test";

      // 1. Fetch all failed surveys from history
      const { data: failedSurveys, error } = await supabaseAdmin
        .from("surveys")
        .select(
          "id, sap_doc_entry, sap_doc_num, card_code, card_name, contact_name, phone, invoice_date, invoice_total, salesperson_name, error_message, created_at",
        )
        .eq("status", "failed")
        .eq("environment", currentEnv)
        .order("created_at", { ascending: false })
        .limit(300);

      if (error || !failedSurveys || failedSurveys.length === 0) {
        return [];
      }

      // Group by sap_doc_entry to keep the latest attempt per document
      const uniqueByDocEntry = new Map<number, (typeof failedSurveys)[0]>();
      for (const s of failedSurveys) {
        if (!uniqueByDocEntry.has(s.sap_doc_entry)) {
          uniqueByDocEntry.set(s.sap_doc_entry, s);
        }
      }

      // 2. Fetch fresh BP contacts directly from SAP for these partners
      clearBpContactCache();
      const cardCodes = Array.from(uniqueByDocEntry.values())
        .map((s) => s.card_code)
        .filter(Boolean);
      const bpMap = await fetchBusinessPartnersBatch(cardCodes, 8, true);

      return Array.from(uniqueByDocEntry.values()).map((s): SaleRow => {
        const bp = bpMap.get(s.card_code) ?? null;
        const freshPhone = pickPhone(bp);

        return {
          docEntry: s.sap_doc_entry,
          docNum: s.sap_doc_num ?? 0,
          docDate: s.invoice_date || s.created_at.slice(0, 10),
          cardCode: s.card_code,
          cardName: s.card_name || "",
          docTotal: Number(s.invoice_total ?? 0),
          series: 0,
          phone: freshPhone || (s.phone !== "NÃO ENCONTRADO" ? s.phone : null),
          contactName: bp?.ContactPerson ?? bp?.CardName ?? s.contact_name ?? null,
          email: pickEmail(bp),
          salespersonName: s.salesperson_name ?? null,
          bplId: (s as { bpl_id?: number }).bpl_id ?? null,
          bplName: (s as { bpl_name?: string }).bpl_name ?? null,
          recebePesquisa: bp?.U_RecebePesquisa ?? "1",
        };
      });
    }

    // 1. Fetch invoices from SAP Service Layer
    const invoices = await listClosedInvoices({ from: data.from, to: data.to });
    if (invoices.length === 0) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("current_environment")
      .eq("id", 1)
      .maybeSingle();
    const currentEnv = settings?.current_environment || "test";

    // 2. Fetch existing surveys to check dispatch status
    const docEntries = invoices.map((i) => i.DocEntry);
    const { data: existingSurveys } = await supabaseAdmin
      .from("surveys")
      .select("sap_doc_entry, status")
      .in("sap_doc_entry", docEntries)
      .eq("environment", currentEnv);

    const surveyStatusMap = new Map<number, "sent" | "answered" | "failed" | "pending">();
    for (const s of existingSurveys || []) {
      if (s.sap_doc_entry) {
        surveyStatusMap.set(
          s.sap_doc_entry,
          s.status as "sent" | "answered" | "failed" | "pending",
        );
      }
    }

    // 3. Fetch Business Partner contacts with bounded concurrency (parallel pool)
    const cardCodes = invoices.map((i) => i.CardCode);
    const bpMap = await fetchBusinessPartnersBatch(cardCodes, 8, Boolean(data.forceFresh));

    // 4. Assemble results
    return invoices.map((inv: InvoiceListItem): SaleRow => {
      const bp = bpMap.get(inv.CardCode) ?? null;
      const bplId = (inv.BPL_IDAssignedToInvoice as number) ?? null;
      const bplName = String(bplId ?? 1);

      return {
        docEntry: inv.DocEntry,
        docNum: inv.SequenceSerial ?? inv.DocNum,
        docDate: formatInvoiceDateUTC(inv.DocDate),
        cardCode: inv.CardCode,
        cardName: inv.CardName,
        docTotal: Number(inv.DocTotal ?? 0),
        series: Number(inv.Series ?? 0),
        phone: pickPhone(bp),
        contactName: bp?.ContactPerson ?? bp?.CardName ?? null,
        email: pickEmail(bp),
        salespersonName: inv.SalesPerson?.SalesEmployeeName ?? null,
        bplId,
        bplName,
        recebePesquisa: bp?.U_RecebePesquisa ?? "1",
        surveyStatus: surveyStatusMap.get(inv.DocEntry) || null,
      };
    });
  });

const SingleContactSchema = z.object({
  cardCode: z.string().min(1, "CardCode obrigatório"),
});

/**
 * Re-fetches a single Business Partner contact directly from SAP (bypassing cache).
 */
export const refreshSingleContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => SingleContactSchema.parse(input))
  .handler(async ({ data }) => {
    const bp = await getBusinessPartnerContact(data.cardCode, true);
    return {
      cardCode: data.cardCode,
      phone: pickPhone(bp),
      contactName: bp?.ContactPerson ?? bp?.CardName ?? null,
      email: pickEmail(bp),
      recebePesquisa: bp?.U_RecebePesquisa ?? "1",
    };
  });
