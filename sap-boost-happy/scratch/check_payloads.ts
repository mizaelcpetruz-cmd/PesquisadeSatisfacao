import { supabaseAdmin } from "../src/integrations/supabase/client.server";

async function main() {
  const { data, error } = await supabaseAdmin
    .from("survey_responses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Erro ao carregar dados:", error);
    return;
  }

  console.log(`Encontradas ${data?.length} respostas de webhook:\n`);

  data?.forEach((row, i) => {
    console.log(`--- Resposta ${i + 1} (${row.created_at}) ---`);
    console.log(`Telefone: ${row.phone}`);
    console.log(`Texto Bruto: ${row.raw_text}`);
    console.log(`Score: ${row.parsed_score}`);
    console.log("Payload:", JSON.stringify(row.payload, null, 2));
    console.log("\n");
  });
}

main().catch(console.error);
