import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse .env manually
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = (match[2] || "").trim();
      if (!value.startsWith('"') && !value.startsWith("'")) {
        const commentIndex = value.indexOf("#");
        if (commentIndex !== -1) {
          value = value.substring(0, commentIndex).trim();
        }
      }
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || "587", 10);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM || user || "no-reply@petruz.com";

// PEGAR E-MAIL DE DESTINO DOS ARGUMENTOS DA LINHA DE COMANDO
const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error("Erro: Forneça o e-mail de destino como argumento.");
  console.error("Exemplo: node scratch/test_send_to.js outro-email@petruz.com");
  process.exit(1);
}

console.log("=== Enviando Teste de E-mail ===");
console.log("- De:", from);
console.log("- Para:", targetEmail);
console.log("================================\n");

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
  tls: {
    rejectUnauthorized: false,
  },
});

async function main() {
  try {
    console.log("Enviando e-mail...");
    const info = await transporter.sendMail({
      from,
      to: targetEmail,
      subject: `Teste Direto SMTP para ${targetEmail}`,
      text: `Olá! Este é um teste enviado pelo painel do NPS para o e-mail ${targetEmail}.`,
      html: `<h3>Teste de Envio de E-mail</h3>
             <p>Este e-mail serve para verificar a entregabilidade das mensagens disparadas pelo sistema NPS.</p>`,
    });
    console.log("👉 E-mail enviado com sucesso!");
    console.log("ID da mensagem:", info.messageId);
  } catch (err) {
    console.error("❌ ERRO NO ENVIO:");
    console.error(err);
  }
}

main();
