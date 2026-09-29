import fs from "fs";

// Parse .env manually
const envPath = "./.env";
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

// Since we need to get the settings from supabase, let's query public.app_settings
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: settings } = await supabase.from("app_settings").select("*").eq("id", 1).single();

  // Login to SAP
  console.log("SAP URL:", settings.sap_sl_url);
  const loginRes = await fetch(`${settings.sap_sl_url}/Login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      CompanyDB: settings.sap_sl_company_db,
      UserName: settings.sap_sl_username,
      Password: settings.sap_sl_password,
    }),
  });

  if (!loginRes.ok) {
    console.error("SAP Login failed", await loginRes.text());
    return;
  }

  const setCookie = loginRes.headers.get("set-cookie") ?? "";
  const cookies = [];
  const sessionMatch = setCookie.match(/B1SESSION=([^;,\s]+)/);
  const routeMatch = setCookie.match(/ROUTEID=([^;,\s]+)/);
  if (sessionMatch) cookies.push(`B1SESSION=${sessionMatch[1]}`);
  if (routeMatch) cookies.push(`ROUTEID=${routeMatch[1]}`);
  const cookieHeader = cookies.join("; ");

  // Fetch one closed invoice
  const queryUrl = `${settings.sap_sl_url}/Invoices?$top=5&$orderby=DocEntry desc`;
  console.log("Querying SAP:", queryUrl);
  const res = await fetch(queryUrl, {
    headers: {
      Cookie: cookieHeader,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    console.error("Failed to query invoices", await res.text());
    return;
  }

  const body = await res.json();
  const invoices = body.value;
  console.log("Found invoices:", invoices?.length);
  if (invoices && invoices.length > 0) {
    const inv = invoices[0];
    console.log("Properties of invoice:");
    console.log("DocEntry:", inv.DocEntry);
    console.log("DocNum:", inv.DocNum);
    console.log("Serial (field):", inv.Serial);
    console.log("SequenceSerial:", inv.SequenceSerial);
    console.log("BlockNum:", inv.BlockNum);
    console.log("Series:", inv.Series);
    console.log("U_TX_NumeroNF:", inv.U_TX_NumeroNF);
    console.log(
      "Full first invoice keys:",
      Object.keys(inv).filter((k) => typeof inv[k] !== "object"),
    );
  }
}

run().catch(console.error);
