import { supabaseAdmin } from "../src/integrations/supabase/client.server.ts";

async function testInsertScore() {
  const { data, error } = await supabaseAdmin
    .from("message_templates")
    .update({ min_score: 1, max_score: 3 } as never)
    .eq("id", "00000000-0000-0000-0000-000000000001")
    .select();

  console.log("Update result with min_score/max_score:", { data, error });
}

testInsertScore();
