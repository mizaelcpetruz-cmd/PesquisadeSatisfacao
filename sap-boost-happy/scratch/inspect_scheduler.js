import { createClient } from "@supabase/supabase-js";
import fs from "fs";

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

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function inspect() {
  try {
    console.log("=== TODOS OS ENVIOS DE HOJE ===");
    const { data: surveys, error: errSurveys } = await supabase
      .from("surveys")
      .select("id, created_at, status, sap_doc_num, phone, invoice_date, error_message")
      .order("created_at", { ascending: false });
    console.log("Surveys:", surveys, "Error:", errSurveys);
  } catch (e) {
    console.error("Erro:", e);
  }
}

inspect();
