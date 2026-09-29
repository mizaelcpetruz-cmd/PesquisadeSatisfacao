import fs from "fs";
import { createClient } from "@supabase/supabase-js";

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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function run() {
  try {
    // 1. List public.profiles
    const { data: profiles, error: pError } = await supabase.from("profiles").select("*");
    console.log("Profiles in DB:", profiles);
    if (pError) console.error("Profiles error:", pError);

    // 2. List auth users
    const {
      data: { users },
      error: uError,
    } = await supabase.auth.admin.listUsers();
    console.log(
      "Auth users:",
      users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        user_metadata: u.user_metadata,
      })),
    );
    if (uError) console.error("Auth users error:", uError);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
