import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardMetrics } from "../dashboard.functions";
import { MetricCards } from "./MetricCards";
import { ScoreDistributionChart } from "./ScoreDistributionChart";
import { NpsCategoryChart } from "./NpsCategoryChart";
import { TimelineChart } from "./TimelineChart";
import { Loader2 } from "lucide-react";

export function DashboardView() {
  const fetchMetrics = useServerFn(getDashboardMetrics);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: () => fetchMetrics(),
    refetchInterval: 60_000, // Refresh automatically every minute
  });

  if (isLoading || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando métricas e indicadores de NPS...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard de Satisfação</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe os resultados das pesquisas de satisfação e os principais indicadores em tempo
          real.
        </p>
      </div>

      {/* Metric summary cards */}
      <MetricCards metrics={metrics} />

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <ScoreDistributionChart data={metrics.scoreDistribution} />
        <NpsCategoryChart data={metrics.npsCategories} />
      </div>

      {/* Historical Timeline */}
      <TimelineChart data={metrics.timelineData} />
    </div>
  );
}
