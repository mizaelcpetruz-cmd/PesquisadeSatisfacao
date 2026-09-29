import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, CheckCircle2, AlertTriangle, TrendingUp, Sparkles } from "lucide-react";
import type { DashboardMetrics } from "../types";

interface MetricCardsProps {
  metrics: DashboardMetrics;
}

export function MetricCards({ metrics }: MetricCardsProps) {
  const npsColor =
    metrics.nps == null
      ? "text-muted-foreground"
      : metrics.nps >= 50
        ? "text-emerald-500"
        : metrics.nps >= 0
          ? "text-amber-500"
          : "text-rose-500";

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {/* NPS Card */}
      <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Índice NPS Geral
          </CardTitle>
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="size-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${npsColor}`}>
            {metrics.nps != null ? `${metrics.nps > 0 ? `+${metrics.nps}` : metrics.nps}` : "—"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.answered} respostas • {metrics.responseRate}% taxa de conversão
          </p>
        </CardContent>
      </Card>

      {/* Enviadas Card */}
      <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Disparos WhatsApp
          </CardTitle>
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Send className="size-4 text-blue-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight">{metrics.sent}</div>
          <p className="text-xs text-muted-foreground mt-1">{metrics.sentToday} enviados hoje</p>
        </CardContent>
      </Card>

      {/* Respondidas Card */}
      <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avaliações Recebidas
          </CardTitle>
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {metrics.answered}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.promoters} Promotores • {metrics.detractors} Detratores
          </p>
        </CardContent>
      </Card>

      {/* Falhas Card */}
      <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Falhas de Envio
          </CardTitle>
          <div className="p-2 rounded-lg bg-rose-500/10">
            <AlertTriangle className="size-4 text-rose-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            {metrics.failed}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Contatos sem celular ou com erro de envio
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
