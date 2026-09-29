import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { listClosedInvoices } from "../src/lib/sap.server.js";

// Parse .env manually
const envPath = "c:/Geral/Dev/Vendas_marketing/sap-boost-happy/.env";
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

// Configure process.env
Object.assign(process.env, env);

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function run() {
  try {
    const today = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);
    const start = new Date(today);
    start.setDate(today.getDate() - 7);

    const from = fmt(start);
    const to = fmt(today);
    console.log(`Buscando Notas Fiscais no SAP de ${from} até ${to}...`);

    const invoices = await listClosedInvoices({ from, to });
    console.log(`Total de notas fechadas encontradas no SAP: ${invoices.length}`);

    if (invoices.length > 0) {
      console.log("Exemplo da primeira nota encontrada:", {
        DocEntry: invoices[0].DocEntry,
        DocNum: invoices[0].DocNum,
        DocDate: invoices[0].DocDate,
        CardCode: invoices[0].CardCode,
        CardName: invoices[0].CardName,
        SequenceSerial: invoices[0].SequenceSerial,
      });

      // Check which ones are already in surveys
      const docEntries = invoices.map((i) => i.DocEntry);
      const { data: existingSurveys } = await supabase
        .from("surveys")
        .select("sap_doc_entry, status")
        .in("sap_doc_entry", docEntries);

      console.log(`Das ${invoices.length} notas:`);
      const existingEntries = new Set(existingSurveys?.map((s) => s.sap_doc_entry) ?? []);
      console.log(`- Já enviadas ou pendentes no banco: ${existingEntries.size}`);

      const pendingToSend = invoices.filter((i) => !existingEntries.has(i.DocEntry));
      console.log(`- Elegíveis para envio (ainda não processadas): ${pendingToSend.length}`);
      if (pendingToSend.length > 0) {
        console.log("Próximas notas elegíveis para disparo:");
        pendingToSend.slice(0, 3).forEach((i) => {
          console.log(
            `  -> NF: ${i.SequenceSerial ?? i.DocNum} | Data: ${i.DocDate} | Cliente: ${i.CardName}`,
          );
        });
      }
    }
  } catch (err) {
    console.error("Erro ao listar faturas:", err);
  }
}

run();
