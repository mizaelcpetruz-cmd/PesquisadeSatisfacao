import { getServerEnv } from "./env.server";

export interface ZenviaConfig {
  token: string;
  from: string;
}

/**
 * Returns type-safe Zenvia WhatsApp configuration.
 */
export function getZenviaConfig(): ZenviaConfig {
  const env = getServerEnv();
  return {
    token: env.ZENVIA_API_TOKEN,
    from: env.ZENVIA_FROM,
  };
}
