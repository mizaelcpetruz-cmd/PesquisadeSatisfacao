import { supabaseAdmin } from "@/integrations/supabase/client.server";

export class LogCleanupService {
  /**
   * Automatically purges logs older than 90 days.
   */
  static async cleanOldLogs(retentionDays = 90): Promise<void> {
    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - retentionDays);
      const thresholdStr = thresholdDate.toISOString();

      const { error, count } = await supabaseAdmin
        .from("system_logs")
        .delete({ count: "exact" })
        .lt("created_at", thresholdStr);

      if (error) {
        console.error("[LogCleanupService] Falha ao limpar logs antigos:", error.message);
      } else if (count && count > 0) {
        console.log(
          `[LogCleanupService] ${count} registros de logs antigos removidos com sucesso.`,
        );
      }
    } catch (err) {
      console.error("[LogCleanupService] Erro inesperado na limpeza de logs:", err);
    }
  }
}
