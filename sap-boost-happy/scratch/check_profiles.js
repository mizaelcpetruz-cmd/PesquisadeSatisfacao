import { supabaseAdmin } from "../src/integrations/supabase/client.server";

async function main() {
  try {
    const { data: roles, error: rolesError } = await supabaseAdmin.from("user_roles").select("*");
    console.log("user_roles table read:", { roles, rolesError });
  } catch (e) {
    console.error("Error reading user_roles:", e);
  }
}

main().catch(console.error);
