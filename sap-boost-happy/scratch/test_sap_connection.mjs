import fs from "fs";
import path from "path";

// Load .env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const baseUrl = (process.env.SAP_SL_URL ?? "").replace(/\/+$/, "");
const companyDB = process.env.SAP_SL_COMPANY_DB ?? "";
const username = process.env.SAP_SL_USERNAME ?? "";
const password = process.env.SAP_SL_PASSWORD ?? "";

async function run() {
  console.log("1. Logging into SAP Service Layer...");
  const loginRes = await fetch(`${baseUrl}/Login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      CompanyDB: companyDB,
      UserName: username,
      Password: password,
    }),
  });

  if (!loginRes.ok) {
    console.error("Login failed:", loginRes.status, await loginRes.text());
    return;
  }

  const setCookie = loginRes.headers.get("set-cookie") ?? "";
  const cookies = [];
  const sessionMatch = setCookie.match(/B1SESSION=([^;,\s]+)/);
  const routeMatch = setCookie.match(/ROUTEID=([^;,\s]+)/);
  if (sessionMatch) cookies.push(`B1SESSION=${sessionMatch[1]}`);
  if (routeMatch) cookies.push(`ROUTEID=${routeMatch[1]}`);
  if (cookies.length === 0) {
    const body = await loginRes.json().catch(() => ({}));
    if (body.SessionId) cookies.push(`B1SESSION=${body.SessionId}`);
  }
  const cookieHeader = cookies.join("; ");
  console.log("Login OK! Cookie:", cookieHeader);

  console.log("\n2. Testing /Invoices query (standard filter as in sap.server.ts)...");
  const select = [
    "DocEntry",
    "DocNum",
    "DocDate",
    "CardCode",
    "CardName",
    "DocTotal",
    "Series",
    "DocumentStatus",
    "JournalMemo",
    "Comments",
    "SequenceSerial",
  ].join(",");

  const filter = `DocumentStatus eq 'bost_Close' and DocDate ge '2026-01-01' and DocDate le '2026-12-31'`;
  const url = `${baseUrl}/Invoices?$select=${select}&$expand=SalesPerson($select=SalesEmployeeName)&$filter=${encodeURIComponent(filter)}&$orderby=DocDate desc`;

  console.log("Fetching URL:", url);
  const invRes = await fetch(url, {
    method: "GET",
    headers: {
      Cookie: cookieHeader,
      "Content-Type": "application/json",
    },
  });

  console.log("Status:", invRes.status, invRes.statusText);
  const invBody = await invRes.text();
  console.log("Response:", invBody.slice(0, 1000));
}

run().catch(console.error);
