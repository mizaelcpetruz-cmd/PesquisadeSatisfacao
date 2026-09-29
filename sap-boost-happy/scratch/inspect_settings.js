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

async function run() {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("company_logo_url")
      .eq("id", 1)
      .maybeSingle();
    if (error) {
      console.log("Column company_logo_url does NOT exist or threw error:", error.message);
    } else {
      console.log("Column company_logo_url exists! Value:", data);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
