import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { testSapConnection } from "@/integrations/sap/sap-client.server";
import { testZenviaConnection } from "@/integrations/zenvia/zenvia.server";
import { testSmtpConnection, sendEmail } from "@/integrations/email/email.server";

export class ConnectionCheckService {
  /**
   * Tests all external infrastructure connections (SAP SL, Zenvia WhatsApp, SMTP Email).
   * Runs daily health checks and alerts supervisors if failures occur.
   */
  static async checkAllConnections(): Promise<{
    sap: { ok: boolean; message: string };
    zenvia: { ok: boolean; message: string };
    smtp: { ok: boolean; message: string };
  }> {
    console.log("[ConnectionCheckService] Iniciando teste diário de conexões...");

    const [sapRes, zenviaRes, smtpRes] = await Promise.all([
      testSapConnection(),
      testZenviaConnection(),
      testSmtpConnection(),
    ]);

    const failures: string[] = [];
    if (!sapRes.ok) failures.push(`SAP Service Layer: ${sapRes.message}`);
    if (!zenviaRes.ok) failures.push(`Zenvia WhatsApp: ${zenviaRes.message}`);
    if (!smtpRes.ok) failures.push(`Servidor SMTP: ${smtpRes.message}`);

    if (failures.length > 0) {
      console.error("[ConnectionCheckService] Falhas detectadas:", failures);

      // Log critical warning in system_logs
      await supabaseAdmin.from("system_logs").insert({
        level: "error",
        category: "connection_check",
        message: `Falha na verificação diária de conexões: ${failures.join("; ")}`,
        details: JSON.stringify({ failures, sap: sapRes, zenvia: zenviaRes, smtp: smtpRes }),
      });

      // Notify supervisors if alerts are not disabled
      if (process.env.DISABLE_ALERTS !== "true" && smtpRes.ok) {
        try {
          const { data: supervisors } = await supabaseAdmin
            .from("profiles")
            .select("email, user_roles!inner(role)")
            .eq("user_roles.role", "admin");

          const emails = (supervisors ?? []).map((s) => s.email).filter(Boolean) as string[];
          if (emails.length > 0) {
            await sendEmail({
              to: emails.join(", "),
              subject: "⚠️ Alerta de Conectividade - Pesquisa Petruz",
              html: `<h2>Alerta de Falha de Conectividade</h2>
                <p>O teste automático de conexões identificou instabilidades:</p>
                <ul>${failures.map((f) => `<li><strong>${f}</strong></li>`).join("")}</ul>
                <p>Por favor, acerte as credenciais no painel de configurações.</p>`,
            });
          }
        } catch (e) {
          console.error("[ConnectionCheckService] Falha ao enviar alerta por e-mail:", e);
        }
      }
    } else {
      console.log("[ConnectionCheckService] Todas as conexões externas estão 100% funcionais.");
    }

    return { sap: sapRes, zenvia: zenviaRes, smtp: smtpRes };
  }
}
