export interface DashboardMetrics {
  total: number;
  sent: number;
  answered: number;
  failed: number;
  pending: number;
  nps: number | null;
  promoters: number;
  neuters: number;
  detractors: number;
  sentToday: number;
  responseRate: number;
  scoreDistribution: Array<{ score: string; Quantidade: number }>;
  npsCategories: Array<{ name: string; value: number; color: string }>;
  timelineData: Array<{ date: string; Enviadas: number; Respondidas: number }>;
}
