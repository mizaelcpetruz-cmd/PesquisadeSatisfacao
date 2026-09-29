import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Parse .env manually
const envPath = "c:/Geral/Dev/Vendas_marketing/sap-boost-happy/.env";
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = (match[2] || "").trim();
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
    console.log("1. Buscando a pesquisa mais recente enviada via WhatsApp com e-mail...");
    const { data: surveys, error } = await supabase
      .from("surveys")
      .select("id, sap_doc_num, phone, email, zenvia_message_id, status")
      .eq("status", "sent")
      .not("email", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Erro ao buscar pesquisa:", error);
      return;
    }

    const survey = surveys?.[0];
    if (!survey) {
      console.log(
        "Nenhuma pesquisa com status 'sent' e e-mail cadastrado foi encontrada no banco.",
      );
      return;
    }

    console.log(`- Pesquisa ID: ${survey.id}`);
    console.log(`- NF:          ${survey.sap_doc_num}`);
    console.log(`- E-mail:      ${survey.email}`);
    console.log(`- Zenvia ID:   ${survey.zenvia_message_id}`);
    console.log(`- Status Atual:${survey.status}\n`);

    if (!survey.zenvia_message_id) {
      console.error("Erro: A pesquisa não possui um zenvia_message_id associado.");
      return;
    }

    console.log("2. Enviando requisição POST de simulação de webhook de falha localmente...");

    const payload = {
      type: "MESSAGE_STATUS",
      messageId: survey.zenvia_message_id,
      messageStatus: {
        status: "FAILED",
        code: "FAILED_CHANNEL_UNAVAILABLE",
        description: "Simulated: Recipient number is not registered on WhatsApp",
      },
    };

    const res = await fetch("http://localhost:8080/api/public/zenvia/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log(`- Status HTTP da resposta: ${res.status}`);
    const text = await res.text();
    console.log(`- Resposta do servidor:    "${text}"\n`);

    console.log("3. Verificando o status atualizado no banco...");
    const { data: updatedSurvey } = await supabase
      .from("surveys")
      .select("status, error_message")
      .eq("id", survey.id)
      .single();

    console.log(`- Novo Status:     ${updatedSurvey?.status}`);
    console.log(`- Mensagem de Erro: ${updatedSurvey?.error_message || "Nenhuma"}`);
  } catch (err) {
    console.error("Erro na execução da simulação:", err);
  }
}

run();
