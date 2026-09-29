import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Parse .env manually
const envPath = "c:/Geral/Dev/Vendas_marketing/sap-boost-happy/.env";
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = (match[2] || "").trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function run() {
  try {
    console.log("=== Últimos 10 lançamentos na tabela public.surveys ===");
    const { data: surveys, error } = await supabase
      .from("surveys")
      .select("id, sap_doc_num, phone, email, status, error_message, created_at, sent_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Erro ao carregar dados:", error);
      return;
    }

    if (!surveys || surveys.length === 0) {
      console.log("Nenhuma pesquisa encontrada na tabela.");
      return;
    }

    surveys.forEach((s, idx) => {
      console.log(`\n[${idx + 1}] ID: ${s.id}`);
      console.log(`    NF/Pedido: ${s.sap_doc_num}`);
      console.log(`    Telefone:  ${s.phone}`);
      console.log(`    E-mail:    ${s.email}`);
      console.log(`    Status:    ${s.status}`);
      console.log(`    Enviado em: ${s.sent_at}`);
      console.log(`    Erro:      ${s.error_message || "Nenhum"}`);
      console.log(`    Criado em: ${s.created_at}`);
    });
  } catch (err) {
    console.error("Caught error:", err);
  }
}

run();
