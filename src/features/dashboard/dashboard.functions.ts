import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth, assertRoles } from "@/integrations/supabase/auth-middleware";
import type { DashboardMetrics } from "./types";

export const getDashboardMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardMetrics> => {
    await assertRoles(context, ["admin", "operador"]);
    const { supabase } = context;

    const { data: settings } = await supabase
      .from("app_settings")
      .select("current_environment")
      .eq("id", 1)
      .maybeSingle();
    const currentEnv = settings?.current_environment || "test";

    // Optimized server query
    const { data: surveys, error } = await supabase
      .from("surveys")
      .select("status, score, sent_at")
      .eq("environment", currentEnv);

    if (error) {
      console.error("[Dashboard Server] Erro ao buscar dados:", error.message);
      throw new Error("Falha ao calcular métricas do dashboard.");
    }

    const all = surveys ?? [];
    const total = all.length;
    const sentWhatsapp = all.filter((s) => s.status === "sent").length;
    const answered = all.filter((s) => s.status === "answered").length;
    const failed = all.filter((s) => s.status === "failed").length;
    const pending = all.filter((s) => s.status === "pending").length;
    const sent = sentWhatsapp + answered;

    const scores = all.filter((s) => s.score != null).map((s) => s.score!) ?? [];
    const promoters = scores.filter((n) => n >= 9).length;
    const neuters = scores.filter((n) => n === 7 || n === 8).length;
    const detractors = scores.filter((n) => n <= 6).length;
    const nps = scores.length ? Math.round(((promoters - detractors) / scores.length) * 100) : null;

    const today = new Date().toISOString().slice(0, 10);
    const sentToday = all.filter((s) => s.sent_at?.startsWith(today)).length;
    const responseRate = sent > 0 ? Math.round((answered / sent) * 100) : 0;

    // 1. Score distribution (0 to 10)
    const distributionMap: Record<number, number> = {};
    for (let i = 0; i <= 10; i++) distributionMap[i] = 0;
    scores.forEach((s) => {
      distributionMap[s] = (distributionMap[s] || 0) + 1;
    });
    const scoreDistribution = Object.keys(distributionMap).map((k) => ({
      score: k,
      Quantidade: distributionMap[Number(k)],
    }));

    // 2. NPS categories split
    const npsCategories = [
      { name: "Promotores (9-10)", value: promoters, color: "#10b981" },
      { name: "Neutros (7-8)", value: neuters, color: "#f59e0b" },
      { name: "Detratores (0-6)", value: detractors, color: "#ef4444" },
    ].filter((c) => c.value > 0);

    // 3. Timeline data (last 15 days in America/Belem)
    const timelineMap: Record<string, { sent: number; answered: number }> = {};
    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString("pt-BR", {
        timeZone: "America/Belem",
        day: "2-digit",
        month: "2-digit",
      });
      timelineMap[dayStr] = { sent: 0, answered: 0 };
    }

    all.forEach((s) => {
      if (!s.sent_at) return;
      const sentDate = new Date(s.sent_at);
      const dayStr = sentDate.toLocaleDateString("pt-BR", {
        timeZone: "America/Belem",
        day: "2-digit",
        month: "2-digit",
      });
      if (timelineMap[dayStr]) {
        timelineMap[dayStr].sent++;
        if (s.status === "answered") {
          timelineMap[dayStr].answered++;
        }
      }
    });

    const timelineData = Object.keys(timelineMap).map((key) => ({
      date: key,
      Enviadas: timelineMap[key].sent,
      Respondidas: timelineMap[key].answered,
    }));

    return {
      total,
      sent,
      answered,
      failed,
      pending,
      nps,
      promoters,
      neuters,
      detractors,
      sentToday,
      responseRate,
      scoreDistribution,
      npsCategories,
      timelineData,
    };
  });
