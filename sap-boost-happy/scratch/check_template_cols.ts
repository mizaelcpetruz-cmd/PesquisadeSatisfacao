import { supabaseAdmin } from "../src/integrations/supabase/client.server.ts";

async function checkColumns() {
  const { data, error } = await supabaseAdmin
    .from("message_templates")
    .select("*")
    .limit(1);

  console.log("Template row sample:", data?.[0]);
  console.log("Error if any:", error);
}

checkColumns();
