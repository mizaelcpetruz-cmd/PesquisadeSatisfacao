/**
 * SAP Business One Service Layer Client (Server-only).
 * Handles authentication, session lifecycle, and OData queries.
 */
import { getSapConfig } from "@/core/config/sap.config";
import { normalizePhone, validateAndFormatE164Mobile } from "@/core/utils/phone.utils";
import type {
  InvoiceListItem,
  ContactInfo,
  SapSubgroup,
  SapBpGroup,
  InvoiceDocumentLine,
} from "./sap.types";

interface SessionInfo {
  cookieHeader: string;
  expiresAt: number;
}

let activeSession: SessionInfo | null = null;
const SESSION_TTL_MS = 25 * 60 * 1000; // 25 min (SAP SL default is 30 min)

// In-memory cache for Business Partner contacts
const bpContactCache = new Map<string, { data: ContactInfo | null; expiresAt: number }>();
const BP_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

function getValidatedConfig() {
  const config = getSapConfig();
  if (!config.baseUrl || !config.companyDB || !config.username || !config.password) {
    throw new Error(
      "Configuração do SAP Service Layer incompleta. Verifique as configurações do sistema.",
    );
  }
  return config;
}

/**
 * Acquires a valid B1SESSION cookie, renewing if expired.
 */
async function getOrRenewSession(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && activeSession && activeSession.expiresAt > now) {
    return activeSession.cookieHeader;
  }

  const config = getValidatedConfig();
  const loginUrl = `${config.baseUrl}/Login`;

  const res = await fetch(loginUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      CompanyDB: config.companyDB,
      UserName: config.username,
      Password: config.password,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    activeSession = null;
    throw new Error(
      `Falha na autenticação SAP Service Layer (${res.status}): ${text.slice(0, 300)}`,
    );
  }

  // Extract cookies from Set-Cookie headers and/or JSON body
  const cookies: string[] = [];

  if (typeof res.headers.getSetCookie === "function") {
    for (const cookieStr of res.headers.getSetCookie()) {
      const match = cookieStr.match(/^([^;]+)/);
      if (match) cookies.push(match[1].trim());
    }
  } else {
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      const rawParts = setCookie.split(/,(?=[^;]+?=)/);
      for (const p of rawParts) {
        const match = p.match(/^([^;]+)/);
        if (match) cookies.push(match[1].trim());
      }
    }
  }

  // If B1SESSION was not in Set-Cookie headers (e.g. only ROUTEID returned), extract from response JSON body
  const hasB1Session = cookies.some((c) => c.startsWith("B1SESSION="));
  if (!hasB1Session) {
    const body = (await res.json().catch(() => ({}))) as { SessionId?: string };
    if (body.SessionId) {
      cookies.unshift(`B1SESSION=${body.SessionId}`);
    }
  }

  const validB1 = cookies.some((c) => c.startsWith("B1SESSION="));
  if (!validB1) {
    activeSession = null;
    throw new Error("Login SAP não retornou cookie de sessão (B1SESSION).");
  }

  const cookieHeader = cookies.join("; ");
  activeSession = {
    cookieHeader,
    expiresAt: now + SESSION_TTL_MS,
  };

  return cookieHeader;
}

/**
 * Executes an authenticated request to SAP Service Layer with automatic 401 retry.
 */
export async function slFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const config = getValidatedConfig();
  const url = path.startsWith("http") ? path : `${config.baseUrl}${path}`;

  let cookie = await getOrRenewSession();
  const headers = new Headers(options.headers);
  headers.set("Cookie", cookie);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Prefer")) {
    headers.set("Prefer", "odata.maxpagesize=200");
  }

  let res = await fetch(url, { ...options, headers });

  // If session expired / invalid on SAP side, re-login and retry once
  if (res.status === 401 || res.status === 403) {
    console.warn("[SAP] Sessão expirada ou rejeitada. Renovando autenticação...");
    cookie = await getOrRenewSession(true);
    headers.set("Cookie", cookie);
    res = await fetch(url, { ...options, headers });
  }

  return res;
}

/**
 * Checks if the document lines represent a valid commercial sale to customer
 * and discards administrative operations (transfer, sample, repair, purchase return, simple delivery).
 */
export function isEffectiveSaleOperation(lines?: InvoiceDocumentLine[] | null): boolean {
  if (!lines || lines.length === 0) {
    // If lines not loaded in query, treat as valid by default
    return true;
  }

  // Non-sale CFOP patterns:
  // - 5.9xx / 6.9xx (Outras saídas / Remessas / Simples Remessa / Conserto / Amostra / Demonstração)
  // - 5.2xx / 6.2xx (Devoluções de compra)
  // - 5.15x / 6.15x (Transferências entre filiais)
  // - 5.408 / 5.409 / 6.408 / 6.409 (Transferência com ST)
  // - 5.410 / 5.411 / 6.410 / 6.411 (Devolução com ST)
  const isExcludedCfop = (rawCfop: string): boolean => {
    const cfop = rawCfop.replace(/\D+/g, "");
    if (!cfop) return false;

    // Remessas (59xx / 69xx)
    if (cfop.startsWith("59") || cfop.startsWith("69")) return true;

    // Devoluções (52xx / 62xx)
    if (cfop.startsWith("52") || cfop.startsWith("62")) return true;

    // Transferências entre filiais (5151, 5152, 6151, 6152, 5408, 5409, 6408, 6409)
    if (
      cfop.startsWith("515") ||
      cfop.startsWith("615") ||
      cfop === "5408" ||
      cfop === "5409" ||
      cfop === "6408" ||
      cfop === "6409"
    ) {
      return true;
    }

    // Devoluções com ST (5410, 5411, 6410, 6411)
    if (cfop === "5410" || cfop === "5411" || cfop === "6410" || cfop === "6411") {
      return true;
    }

    return false;
  };

  // If all lines have excluded CFOPs, it is NOT an effective sale
  const linesWithCfop = lines.filter((l) => l.CFOPCode);
  if (linesWithCfop.length > 0) {
    const allExcluded = linesWithCfop.every((l) => isExcludedCfop(String(l.CFOPCode)));
    if (allExcluded) {
      return false;
    }
  }

  return true;
}

const salesPersonCache = new Map<number, string>();
let salesPersonCacheExpiresAt = 0;
const SP_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Loads and caches SAP Sales Persons (OSLP / /SalesPersons).
 */
export async function getSalesPersonsMap(): Promise<Map<number, string>> {
  const now = Date.now();
  if (salesPersonCache.size > 0 && salesPersonCacheExpiresAt > now) {
    return salesPersonCache;
  }

  try {
    const res = await slFetch(
      "/SalesPersons?$select=SalesEmployeeCode,SalesEmployeeName&$top=500",
    );
    if (res.ok) {
      const data = (await res.json()) as {
        value?: Array<{ SalesEmployeeCode: number; SalesEmployeeName: string }>;
      };
      salesPersonCache.clear();
      for (const sp of data.value ?? []) {
        salesPersonCache.set(sp.SalesEmployeeCode, sp.SalesEmployeeName);
      }
      salesPersonCacheExpiresAt = now + SP_CACHE_TTL_MS;
    }
  } catch (err) {
    console.warn("[SAP Client] Não foi possível carregar catálogo de vendedores:", err);
  }

  return salesPersonCache;
}

/**
 * Fetches DocEntries of Invoices that have been returned via Credit Notes (RIN1 / ORIN with BaseType = 13).
 * Corresponds to SQL: NOT EXISTS (SELECT 1 FROM RIN1 R1 WHERE R1.BaseType = 13 AND R1.BaseEntry = OINV.DocEntry)
 */
export async function fetchReturnedInvoiceDocEntries(fromDate?: string): Promise<Set<number>> {
  const returnedSet = new Set<number>();
  try {
    const filter = fromDate
      ? `Cancelled ne 'tYES' and Cancelled ne 'Y' and DocDate ge '${fromDate}'`
      : `Cancelled ne 'tYES' and Cancelled ne 'Y'`;

    let url: string | null = `/CreditNotes?$select=DocEntry,DocDate,Cancelled,DocumentLines&$filter=${encodeURIComponent(filter)}&$orderby=DocDate desc&$top=500`;

    while (url) {
      const res = await slFetch(url);
      if (!res.ok) break;

      const body = (await res.json()) as {
        value: Array<{
          DocumentLines?: Array<{ BaseType?: number; BaseEntry?: number }>;
        }>;
        "odata.nextLink"?: string;
        "@odata.nextLink"?: string;
      };

      for (const cn of body.value ?? []) {
        for (const line of cn.DocumentLines ?? []) {
          if (line.BaseType === 13 && typeof line.BaseEntry === "number") {
            returnedSet.add(line.BaseEntry);
          }
        }
      }

      const rawNext = body["@odata.nextLink"] || body["odata.nextLink"];
      url = rawNext ? (rawNext.startsWith("http") || rawNext.startsWith("/") ? rawNext : `/${rawNext}`) : null;
      if (returnedSet.size > 5000) break;
    }
  } catch (err) {
    console.error(
      "[SAP Client] Erro ao buscar devoluções de notas fiscais (CreditNotes / RIN1):",
      err,
    );
  }

  return returnedSet;
}

/**
 * List customer invoices / Notas Fiscais de Saída (OINV) in the given date range.
 * Fetches all sales invoices, excluding cancelled ones, returned ones (RIN1), and non-sale operations.
 */
export async function listClosedInvoices(opts: {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  onlyClosed?: boolean;
}): Promise<InvoiceListItem[]> {
  const baseSelect = [
    "DocEntry",
    "DocNum",
    "DocDate",
    "CardCode",
    "CardName",
    "DocTotal",
    "Series",
    "DocumentStatus",
    "Cancelled",
    "CancelStatus",
    "JournalMemo",
    "Comments",
    "SequenceSerial",
    "SalesPersonCode",
    "BPL_IDAssignedToInvoice",
    "BPLName",
    "DocumentLines",
  ];

  const filter = [
    `DocDate ge '${opts.from}'`,
    `DocDate le '${opts.to}'`,
  ].join(" and ");

  const rawInvoices: InvoiceListItem[] = [];
  let url: string | null =
    `/Invoices?$select=${baseSelect.join(",")}&$filter=${encodeURIComponent(filter)}&$orderby=DocDate desc&$top=200`;

  let useFallbackSelect = false;

  while (url) {
    let res: Response = await slFetch(url);

    // If multi-branch or specific fields are rejected, fallback without optional fields
    if (!res.ok && !useFallbackSelect) {
      useFallbackSelect = true;
      const simpleSelect = [
        "DocEntry",
        "DocNum",
        "DocDate",
        "CardCode",
        "CardName",
        "DocTotal",
        "Series",
        "DocumentStatus",
        "Cancelled",
        "CancelStatus",
        "JournalMemo",
        "Comments",
        "SequenceSerial",
        "SalesPersonCode",
        "DocumentLines",
      ];
      url = `/Invoices?$select=${simpleSelect.join(",")}&$filter=${encodeURIComponent(filter)}&$orderby=DocDate desc&$top=200`;
      res = await slFetch(url);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SAP /Invoices falhou (${res.status}): ${text.slice(0, 300)}`);
    }

    const body = (await res.json()) as {
      value: InvoiceListItem[];
      "odata.nextLink"?: string;
      "@odata.nextLink"?: string;
    };
    rawInvoices.push(...(body.value ?? []));

    const rawNext = body["@odata.nextLink"] || body["odata.nextLink"];
    url = rawNext ? (rawNext.startsWith("http") || rawNext.startsWith("/") ? rawNext : `/${rawNext}`) : null;
    if (rawInvoices.length > 5000) break; // safety cap
  }

  // Fetch Credit Notes (RIN1) and SalesPersons concurrently
  const [returnedDocEntries, salesPersonsMap] = await Promise.all([
    fetchReturnedInvoiceDocEntries(opts.from),
    getSalesPersonsMap(),
  ]);

  const items = rawInvoices
    .filter((inv) => {
      // 1. Status: se opts.onlyClosed for explicitamente solicitado, filtra somente fechadas
      if (opts.onlyClosed) {
        const isClosed = inv.DocumentStatus === "bost_Close" || inv.DocumentStatus === "C";
        if (!isClosed) return false;
      }

      // 2. Não cancelado (CANCELED = 'N')
      // Exclui tanto a nota cancelada (CANCELED = 'Y' / csYes) quanto a nota de cancelamento/estorno (CANCELED = 'C' / csCancellation)
      const isCancellation =
        inv.CancelStatus === "csCancellation" ||
        inv.CancelStatus === "csYes" ||
        inv.Cancelled === "tYES" ||
        inv.Cancelled === "Y";

      const isNonCancelled =
        inv.CancelStatus === "csNo" || inv.Cancelled === "tNO" || inv.Cancelled === "N";

      if (isCancellation || !isNonCancelled) {
        return false;
      }

      // 3. Não devolvido (NOT EXISTS em RIN1 onde BaseType = 13 e BaseEntry = DocEntry)
      if (returnedDocEntries.has(inv.DocEntry)) {
        return false;
      }

      // 4. Operação de venda efetiva (CFOP / Utilização)
      if (inv.DocumentLines && !isEffectiveSaleOperation(inv.DocumentLines)) {
        return false;
      }

      return true;
    })
    .map((inv) => {
      const spName =
        typeof inv.SalesPersonCode === "number"
          ? salesPersonsMap.get(inv.SalesPersonCode)
          : undefined;
      return {
        ...inv,
        SalesPerson: spName ? { SalesEmployeeName: spName } : inv.SalesPerson ?? null,
      };
    });

  return items;
}

export const listInvoices = listClosedInvoices;

/**
 * Clears the in-memory Business Partner contact cache.
 */
export function clearBpContactCache(cardCode?: string): void {
  if (cardCode) {
    bpContactCache.delete(cardCode);
  } else {
    bpContactCache.clear();
  }
}

/**
 * Gets Business Partner contact details with in-memory caching or fresh query.
 * Queries standard contact fields with automatic resilient fallback for UDFs.
 */
export async function getBusinessPartnerContact(
  cardCode: string,
  forceFresh = false,
): Promise<ContactInfo | null> {
  const now = Date.now();
  if (!forceFresh) {
    const cached = bpContactCache.get(cardCode);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }
  }

  // 1. Try querying with U_Subgrupo
  let path = `/BusinessPartners('${encodeURIComponent(cardCode)}')?$select=CardCode,CardName,Phone1,Phone2,Cellular,EmailAddress,ContactPerson,ContactEmployees,GroupCode,U_Subgrupo`;
  let res = await slFetch(path);

  // 2. If 400 (e.g. UDF not configured in SAP), fallback to standard SAP B1 fields
  if (!res.ok && res.status === 400) {
    path = `/BusinessPartners('${encodeURIComponent(cardCode)}')?$select=CardCode,CardName,Phone1,Phone2,Cellular,EmailAddress,ContactPerson,ContactEmployees,GroupCode`;
    res = await slFetch(path);
  }

  // 3. If still failing with 400, fallback to basic endpoint
  if (!res.ok && res.status === 400) {
    path = `/BusinessPartners('${encodeURIComponent(cardCode)}')`;
    res = await slFetch(path);
  }

  if (!res.ok) {
    if (res.status === 404) {
      bpContactCache.set(cardCode, { data: null, expiresAt: now + BP_CACHE_TTL_MS });
      return null;
    }
    const text = await res.text();
    throw new Error(`SAP BP falhou (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as ContactInfo;
  bpContactCache.set(cardCode, { data, expiresAt: now + BP_CACHE_TTL_MS });
  return data;
}

/**
 * Updates U_RecebePesquisa flag on BusinessPartner in SAP Service Layer.
 * Sets "0" (Não) when optOut=true, or "1" (Sim) when optOut=false.
 */
export async function updateBusinessPartnerOptOut(
  cardCode: string,
  optOut: boolean,
): Promise<boolean> {
  try {
    const val = optOut ? "0" : "1";
    const path = `/BusinessPartners('${encodeURIComponent(cardCode)}')`;
    const res = await slFetch(path, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        U_RecebePesquisa: val,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(
        `[SAP Client] Falha ao atualizar U_RecebePesquisa do parceiro ${cardCode} (${res.status}):`,
        errText,
      );
      return false;
    }

    clearBpContactCache(cardCode);
    console.log(
      `[SAP Client] U_RecebePesquisa atualizado com sucesso no SAP para ${cardCode} -> "${val}".`,
    );
    return true;
  } catch (err) {
    console.error(
      `[SAP Client] Erro ao enviar PATCH de opt-out para SAP para ${cardCode}:`,
      err,
    );
    return false;
  }
}

/**
 * Fetches multiple Business Partners with bounded concurrency (parallel pool).
 */
export async function fetchBusinessPartnersBatch(
  cardCodes: string[],
  concurrency = 8,
  forceFresh = false,
): Promise<Map<string, ContactInfo | null>> {
  const result = new Map<string, ContactInfo | null>();
  const uniqueCodes = Array.from(new Set(cardCodes));

  for (let i = 0; i < uniqueCodes.length; i += concurrency) {
    const chunk = uniqueCodes.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (code) => {
        try {
          const bp = await getBusinessPartnerContact(code, forceFresh);
          result.set(code, bp);
        } catch (err) {
          console.error(`[SAP Client] Erro ao buscar parceiro ${code}:`, err);
          result.set(code, null);
        }
      }),
    );
  }

  return result;
}

/**
 * Test SAP Service Layer connection.
 */
export async function testSapConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const cookie = await getOrRenewSession(true);
    if (!cookie) return { ok: false, message: "Sem cookie de sessão retornado." };
    const res = await slFetch("/Invoices?$top=1&$select=DocEntry");
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        ok: false,
        message: `Falha na query de teste (${res.status}): ${errText.slice(0, 200)}`,
      };
    }
    return { ok: true, message: "Conexão com SAP Service Layer ativa e autenticada." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Picks the mobile phone for WhatsApp directly and exclusively from OCRD.Cellular (Parceiro de Negócios).
 */
export function pickPhone(bp: ContactInfo | null): string | null {
  if (!bp || !bp.Cellular) return null;

  const raw = String(bp.Cellular).trim();
  if (!raw) return null;

  // 1. Tenta validar e formatar no padrão E.164 celular (Brasil)
  const res = validateAndFormatE164Mobile(raw);
  if (res.valid && res.e164) {
    return res.e164;
  }

  // 2. Se não for celular E.164 estrito, retorna o número normalizado para exibição/diagnóstico
  const norm = normalizePhone(raw);
  return norm || raw;
}

/**
 * Picks the best email for communication.
 */
export function pickEmail(bp: ContactInfo | null): string | null {
  if (!bp) return null;
  const contactName = bp.ContactPerson;
  const matchingContact = (bp.ContactEmployees ?? []).find(
    (c) =>
      contactName &&
      (c.Name === contactName || `${c.FirstName ?? ""} ${c.LastName ?? ""}`.trim() === contactName),
  );
  if (matchingContact?.E_Mail) {
    const email = matchingContact.E_Mail.trim();
    if (email.includes("@")) return email;
  }
  if (bp.EmailAddress) {
    const email = bp.EmailAddress.trim();
    if (email.includes("@")) return email;
  }
  return null;
}

/**
 * Fetches Business Partner Groups directly from SAP Service Layer (/BusinessPartnerGroups).
 */
export async function fetchSapBpGroups(): Promise<SapBpGroup[]> {
  try {
    const res = await slFetch("/BusinessPartnerGroups?$top=500&$orderby=Name asc");
    if (!res.ok) {
      console.warn(`[SAP Client] /BusinessPartnerGroups retornou status ${res.status}`);
      return [];
    }
    const data = (await res.json()) as {
      value?: Array<{ Code: number | string; Name: string; Type?: string }>;
    };
    return (data.value ?? []).map((g) => ({
      groupCode: String(g.Code),
      groupName: String(g.Name || "").trim(),
      type: g.Type,
    }));
  } catch (err) {
    console.error("[SAP Client] Erro ao buscar grupos de parceiros do SAP:", err);
    return [];
  }
}

/**
 * Syncs Groups and Subgroups dynamically from SAP Service Layer using the official @CSG_LINHA table.
 * Queries UDO /CSG_CADSUBG (header @CSG_DOCUMENTO, lines @CSG_LINHA) and /BusinessPartnerGroups.
 */
export async function syncSapGroupsAndSubgroups(): Promise<{
  groups: SapBpGroup[];
  subgroups: SapSubgroup[];
}> {
  const sapGroups = await fetchSapBpGroups();
  const groupMap = new Map<string, string>();
  for (const g of sapGroups) {
    groupMap.set(g.groupCode, g.groupName);
  }

  const catalogMap = new Map<string, SapSubgroup>();

  // 1. Primary Source: Fetch UDO /CSG_CADSUBG (Tabelas @CSG_DOCUMENTO e @CSG_LINHA)
  try {
    const csgRes = await slFetch("/CSG_CADSUBG?$top=500");
    if (csgRes.ok) {
      const csgData = (await csgRes.json()) as {
        value?: Array<{
          DocEntry: number;
          U_Codgrup?: string | number | null;
          U_Descgrup?: string | null;
          CSG_LINHACollection?: Array<{
            LineId: number;
            U_Descsubg?: string | null;
            U_Obs?: string | null;
          }>;
        }>;
      };

      for (const doc of csgData.value ?? []) {
        const rawGCode = doc.U_Codgrup != null ? String(doc.U_Codgrup).trim() : "";
        if (!rawGCode || rawGCode === "null") continue;

        const gCode = rawGCode;
        const gName =
          String(doc.U_Descgrup || "").trim() ||
          groupMap.get(gCode) ||
          `Grupo ${gCode}`;

        if (!groupMap.has(gCode)) {
          groupMap.set(gCode, gName);
        }

        const lines = doc.CSG_LINHACollection ?? [];
        for (const line of lines) {
          const subName = line.U_Descsubg != null ? String(line.U_Descsubg).trim() : "";
          if (!subName || subName === "null") continue;

          const code = `${gCode}:${subName}`;
          catalogMap.set(code, {
            Code: code,
            Name: subName,
            Group: gName,
            groupCode: gCode,
            groupName: gName,
            subgroup: subName,
          });
        }
      }
    } else {
      console.warn(`[SAP Client] Falha ao consultar /CSG_CADSUBG (${csgRes.status})`);
    }
  } catch (err) {
    console.error("[SAP Client] Erro ao consultar @CSG_LINHA (/CSG_CADSUBG):", err);
  }

  // 2. Secondary check: Business Partners in SAP with U_Subgrupo
  try {
    const bpRes = await slFetch(
      "/BusinessPartners?$select=GroupCode,U_Subgrupo&$filter=U_Subgrupo ne null and U_Subgrupo ne ''&$top=2000",
    );
    if (bpRes.ok) {
      const bpData = (await bpRes.json()) as {
        value?: Array<{ GroupCode?: number | string; U_Subgrupo?: string }>;
      };
      for (const bp of bpData.value ?? []) {
        const gCode = String(bp.GroupCode ?? "").trim();
        const sub = String(bp.U_Subgrupo ?? "").trim();
        if (gCode && sub && gCode !== "null" && sub !== "null") {
          const code = `${gCode}:${sub}`;
          if (!catalogMap.has(code)) {
            const gName = groupMap.get(gCode) || `Grupo ${gCode}`;
            catalogMap.set(code, {
              Code: code,
              Name: sub,
              Group: gName,
              groupCode: gCode,
              groupName: gName,
              subgroup: sub,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("[SAP Client] Não foi possível consultar subgrupos dinâmicos dos parceiros:", err);
  }

  // 3. Fallback: If CSG was empty (e.g. communication error), fallback to STATIC_SUBGROUPS
  if (catalogMap.size === 0) {
    const { STATIC_SUBGROUPS } = await import("./sap-subgroups.data");
    for (const item of STATIC_SUBGROUPS) {
      const gName = groupMap.get(item.groupCode) || item.groupName;
      catalogMap.set(item.Code, {
        ...item,
        groupName: gName,
        Group: gName,
      });
    }
  }

  // Ensure all SAP groups exist in groupMap
  for (const g of sapGroups) {
    if (!groupMap.has(g.groupCode)) {
      groupMap.set(g.groupCode, g.groupName);
    }
    // If the group has no subgroup at all, add a (Sem Subgrupo) placeholder
    const hasAny = Array.from(catalogMap.values()).some((s) => s.groupCode === g.groupCode);
    if (!hasAny) {
      const emptyCode = `${g.groupCode}:`;
      catalogMap.set(emptyCode, {
        Code: emptyCode,
        Name: "(Sem Subgrupo)",
        Group: g.groupName,
        groupCode: g.groupCode,
        groupName: g.groupName,
        subgroup: "(Sem Subgrupo)",
      });
    }
  }

  const finalGroups: SapBpGroup[] = Array.from(groupMap.entries())
    .map(([groupCode, groupName]) => ({ groupCode, groupName }))
    .sort((a, b) => a.groupName.localeCompare(b.groupName));

  const finalSubgroups = Array.from(catalogMap.values()).sort((a, b) => {
    const gCmp = (a.groupName || "").localeCompare(b.groupName || "");
    if (gCmp !== 0) return gCmp;
    return (a.Name || "").localeCompare(b.Name || "");
  });

  return {
    groups: finalGroups,
    subgroups: finalSubgroups,
  };
}

export async function listSapSubgroups(): Promise<SapSubgroup[]> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("custom_subgroups")
      .eq("id", 1)
      .maybeSingle();

    const custom = settings?.custom_subgroups as SapSubgroup[] | null;
    if (custom && Array.isArray(custom) && custom.length > 0) {
      return custom;
    }
  } catch (err) {
    console.warn("[SAP Client] Não foi possível ler custom_subgroups do Supabase:", err);
  }

  const { STATIC_SUBGROUPS } = await import("./sap-subgroups.data");
  return STATIC_SUBGROUPS;
}

