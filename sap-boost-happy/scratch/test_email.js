import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple manual .env parser
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = (match[2] || "").trim();
      // Remove comment suffix if not in quotes
      if (!value.startsWith('"') && !value.startsWith("'")) {
        const commentIndex = value.indexOf("#");
        if (commentIndex !== -1) {
          value = value.substring(0, commentIndex).trim();
        }
      }
      // Remove surrounding quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
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

console.log("=== Configuração SMTP Carregada ===");
console.log("- Host:", host);
console.log("- Port:", port);
console.log("- User:", user);
console.log("- Pass:", pass ? "****** (Configurada)" : "Não configurada");
console.log("- From:", from);
console.log("===================================\n");

if (!host || !user || !pass) {
  console.error(
    "Erro: Variáveis SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) não localizadas no seu arquivo .env.",
  );
  process.exit(1);
}

// Criar transportador SMTP básico
const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
  tls: {
    // Permite conexões mesmo se o certificado SSL do SMTP for auto-assinado ou tiver alertas
    rejectUnauthorized: false,
  },
});

async function main() {
  try {
    console.log("1. Verificando a conexão com o servidor SMTP (Handshake/Auth)...");
    await transporter.verify();
    console.log("👉 Conexão SMTP estabelecida e autenticada com sucesso!\n");

    console.log(`2. Tentando enviar e-mail de teste para ${user}...`);
    const info = await transporter.sendMail({
      from,
      to: user,
      subject: "Teste de SMTP — NPS Petruz",
      text: "Se você recebeu este e-mail, as credenciais SMTP no seu arquivo .env estão corretas!",
      html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Conexão SMTP OK!</h2>
        <p>Este é um e-mail de teste enviado pelo script de depuração do sistema NPS.</p>
        <p>A configuração no seu arquivo <strong>.env</strong> está funcionando perfeitamente.</p>
      </div>`,
    });
    console.log("👉 E-mail de teste enviado com sucesso!");
    console.log("ID da mensagem:", info.messageId);
  } catch (err) {
    console.error("\n❌ ERRO DETECTADO:");
    console.error(err);
  }
}

main();
