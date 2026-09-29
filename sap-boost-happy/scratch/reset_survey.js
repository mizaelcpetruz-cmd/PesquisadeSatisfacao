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

async function reset() {
  try {
    console.log("Removendo pesquisa de teste para sap_doc_entry = 10149...");
    const { error } = await supabase.from("surveys").delete().eq("sap_doc_entry", 10149);

    if (error) {
      console.error("Erro ao deletar:", error);
    } else {
      console.log("Pesquisa deletada do banco! A nota fiscal 89237 está elegível para re-envio.");
    }
  } catch (e) {
    console.error("Erro:", e);
  }
}

reset();
