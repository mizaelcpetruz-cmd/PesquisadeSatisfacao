import { supabaseAdmin } from "../src/integrations/supabase/client.server.ts";

async function testActiveCol() {
  const { data, error } = await supabaseAdmin
    .from("message_templates")
    .update({ active: true } as never)
    .eq("id", "00000000-0000-0000-0000-000000000001")
    .select();

  console.log("Update with active col:", { data, error });
}

testActiveCol();
