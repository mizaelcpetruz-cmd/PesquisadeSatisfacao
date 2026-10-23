import { getServerEnv } from "./env.server";

export interface SapConfig {
  baseUrl: string;
  companyDB: string;
  username: string;
  password: string;
}

/**
 * Returns type-safe SAP Service Layer configuration.
 */
export function getSapConfig(): SapConfig {
  const env = getServerEnv();
  return {
    baseUrl: (env.SAP_SL_URL || "").replace(/\/+$/, ""),
    companyDB: env.SAP_SL_COMPANY_DB,
    username: env.SAP_SL_USERNAME,
    password: env.SAP_SL_PASSWORD,
  };
}
