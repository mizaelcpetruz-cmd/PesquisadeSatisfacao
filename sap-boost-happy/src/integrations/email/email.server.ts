/**
 * Server-only SMTP Email Service using Nodemailer.
 * Reads configurations strictly from `src/core/config/email.config.ts`.
 */
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getEmailConfig } from "@/core/config/email.config";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

let sharedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (sharedTransporter) return sharedTransporter;

  const config = getEmailConfig();

  if (!config.host || !config.auth.user || !config.auth.pass) {
    throw new Error(
      "Credenciais de SMTP incompletas no arquivo de configuração do servidor (.env).",
    );
  }

  sharedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.auth.user,
      pass: config.auth.pass,
    },
    pool: config.pool,
    maxConnections: config.maxConnections,
    connectionTimeout: config.connectionTimeout,
    greetingTimeout: config.greetingTimeout,
    socketTimeout: config.socketTimeout,
  } as nodemailer.TransportOptions);

  return sharedTransporter;
}

/**
 * Sends an email using the configured SMTP server.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const config = getEmailConfig();
  const transporter = getTransporter();

  const mailOptions = {
    from: config.from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    replyTo: opts.replyTo || config.from,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] E-mail enviado com sucesso para ${opts.to}. MessageId: ${info.messageId}`);
  } catch (error) {
    console.error(`[Email] Falha ao enviar e-mail para ${opts.to}:`, error);
    throw error;
  }
}

/**
 * Tests connection with SMTP server.
 */
export async function testSmtpConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return { ok: true, message: "Servidor SMTP autenticado e pronto para envio." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
