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

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  const url = `${SUPABASE_URL}/rest/v1/app_settings?select=*`;
  console.log("Fetching app_settings:", url);
  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    console.log("Response Status:", res.status);
    if (res.ok) {
      const data = await res.json();
      console.log("App Settings Data:", JSON.stringify(data, null, 2));
    } else {
      const text = await res.text();
      console.log("Response Body:", text);
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

run();
