import { getServerEnv } from "./env.server";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  pool: boolean;
  maxConnections: number;
  connectionTimeout: number;
  greetingTimeout: number;
  socketTimeout: number;
}

/**
 * Returns type-safe SMTP Email configuration.
 */
export function getEmailConfig(): EmailConfig {
  const env = getServerEnv();
  const port = env.SMTP_PORT || 465;
  const isSecure = port === 465;

  return {
    host: env.SMTP_HOST,
    port,
    secure: isSecure,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    from: env.SMTP_FROM || `Pesquisa Petruz <${env.SMTP_USER}>`,
    pool: true,
    maxConnections: 5,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  };
}
