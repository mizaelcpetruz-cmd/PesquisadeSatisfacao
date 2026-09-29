/**
 * Unified Runtime Settings Service (Server-only).
 * Reads infrastructure credentials strictly from validated environment configurations.
 */
import { getSapConfig, type SapConfig } from "@/config/sap.config";
import { getZenviaConfig, type ZenviaConfig } from "@/config/zenvia.config";
import { getEmailConfig, type EmailConfig } from "@/config/email.config";

export interface RuntimeSettings {
  sap: SapConfig;
  zenvia: ZenviaConfig;
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
}

let cache: { value: RuntimeSettings | null; expiresAt: number } | null = null;

export async function getSettings(force = false): Promise<RuntimeSettings> {
  const now = Date.now();
  if (!force && cache && cache.value && cache.expiresAt > now) {
    return cache.value;
  }

  const sap = getSapConfig();
  const zenvia = getZenviaConfig();
  const email = getEmailConfig();

  const settings: RuntimeSettings = {
    sap,
    zenvia,
    smtp: {
      host: email.host,
      port: email.port,
      user: email.auth.user,
      pass: email.auth.pass,
      from: email.from,
    },
  };

  cache = { value: settings, expiresAt: now + 30_000 };
  return settings;
}

export function invalidateSettingsCache(): void {
  cache = null;
}
