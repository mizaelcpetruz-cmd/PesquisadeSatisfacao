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

const emailBodyHtml = `<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111;">
  <p>Olá <strong>{{nome_cliente}}</strong>,</p>
  <p>Agradecemos a sua preferência e confiança na Petruz!</p>
  <p>Para nos ajudar a aprimorar nosso atendimento, de 0 a 10, qual a probabilidade de você recomendar a Petruz a um amigo ou colega?</p>
  
  <table border="0" cellpadding="0" cellspacing="5" style="margin: 30px 0; width: 100%; text-align: center;">
    <tr>
      <td style="border-radius: 4px;" bgcolor="#dc2626"><a href="{{link_nota_0}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">0</a></td>
      <td style="border-radius: 4px;" bgcolor="#dc2626"><a href="{{link_nota_1}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">1</a></td>
      <td style="border-radius: 4px;" bgcolor="#ea580c"><a href="{{link_nota_2}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">2</a></td>
      <td style="border-radius: 4px;" bgcolor="#ea580c"><a href="{{link_nota_3}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">3</a></td>
      <td style="border-radius: 4px;" bgcolor="#eab308"><a href="{{link_nota_4}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">4</a></td>
      <td style="border-radius: 4px;" bgcolor="#eab308"><a href="{{link_nota_5}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">5</a></td>
      <td style="border-radius: 4px;" bgcolor="#eab308"><a href="{{link_nota_6}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">6</a></td>
      <td style="border-radius: 4px;" bgcolor="#84cc16"><a href="{{link_nota_7}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">7</a></td>
      <td style="border-radius: 4px;" bgcolor="#84cc16"><a href="{{link_nota_8}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">8</a></td>
      <td style="border-radius: 4px;" bgcolor="#16a34a"><a href="{{link_nota_9}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">9</a></td>
      <td style="border-radius: 4px;" bgcolor="#16a34a"><a href="{{link_nota_10}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">10</a></td>
    </tr>
  </table>

  <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
    Esta é uma pesquisa automática relacionada ao pedido #{{id_pedido}}. Sua opinião é de extrema importância para nós.
  </p>
</div>`;

async function run() {
  try {
    console.log("Iniciando a correção de caracteres (Mojibake)...");

    // 1. Atualizar app_settings
    console.log("Atualizando app_settings...");
    const { error: settingsError } = await supabase
      .from("app_settings")
      .update({
        thank_you_promoter:
          "Muito obrigado pela sua resposta e pela excelente nota! Ficamos muito felizes em saber que teve uma boa experiência. 😊",
        thank_you_detractor:
          "Agradecemos o seu feedback! A sua opinião é muito importante para nos ajudar a melhorar continuamente. 🙏",
        email_template_subject: "Pesquisa de Satisfação Petruz",
        email_template_body: emailBodyHtml,
      })
      .eq("id", 1);

    if (settingsError) {
      console.error("Erro ao atualizar app_settings:", settingsError);
    } else {
      console.log("app_settings atualizado com sucesso!");
    }

    // 2. Atualizar message_templates
    console.log("Atualizando message_templates...");

    // Listar todos os templates existentes para podermos achar o default e os outros por ID ou nome
    const { data: templates, error: listError } = await supabase
      .from("message_templates")
      .select("*");

    if (listError) {
      console.error("Erro ao listar message_templates:", listError);
      return;
    }

    for (const template of templates) {
      let newName = template.name;
      let newBody = template.body;
      let shouldUpdate = false;

      if (template.id === "00000000-0000-0000-0000-000000000001" || template.name.includes("Bom")) {
        newName = "Resposta Automática — Bom (Notas 9-10)";
        newBody =
          "Muito obrigado pela sua resposta e pela excelente nota! Ficamos muito felizes em saber que teve uma boa experiência. 😊";
        shouldUpdate = true;
      } else if (
        template.id === "00000000-0000-0000-0000-000000000002" ||
        (template.name.includes("M") && template.name.includes("dio"))
      ) {
        newName = "Resposta Automática — Médio (Notas 7-8)";
        newBody =
          "Agradecemos o seu feedback! Trabalhamos constantemente para melhorar nossos serviços e sua opinião nos ajuda muito. 👍";
        shouldUpdate = true;
      } else if (
        template.id === "00000000-0000-0000-0000-000000000003" ||
        template.name.includes("Ruim")
      ) {
        newName = "Resposta Automática — Ruim (Notas 0-6)";
        newBody =
          "Agradecemos o seu feedback! Lamentamos que sua experiência não tenha sido ideal e entraremos em contato para entender como podemos melhorar. 🙏";
        shouldUpdate = true;
      } else if (
        template.is_default &&
        (template.name.includes("Pesquisa") || template.name.includes("Padra"))
      ) {
        newName = "Pesquisa de Satisfação Padrão";
        newBody =
          "Olá {{nome}}! Sou da Petruz. Recebemos sua compra (NF {{numero_nf}}) e gostaríamos de saber: de 0 a 10, qual a chance de você nos indicar a um amigo? Responda apenas com um número de 0 a 10. Obrigado! 🙏";
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        console.log(`Corrigindo template [${template.name}] para [${newName}]...`);
        const { error: updateError } = await supabase
          .from("message_templates")
          .update({
            name: newName,
            body: newBody,
          })
          .eq("id", template.id);

        if (updateError) {
          console.error(`Erro ao atualizar template ${template.id}:`, updateError);
        } else {
          console.log(`Template ${template.id} corrigido!`);
        }
      }
    }

    console.log("Processo de correção concluído!");
  } catch (err) {
    console.error("Erro geral:", err);
  }
}

run();
