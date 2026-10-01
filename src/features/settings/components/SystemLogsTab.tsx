import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSystemLogs, logLogsExport } from "../settings.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Filter, RotateCcw, Loader2 } from "lucide-react";
import { formatLocalizedDateTime, getBrazilDateString } from "@/core/utils/date.utils";
import { toast } from "sonner";
import type { SystemLogEntry } from "../types";

export function SystemLogsTab() {
  const today = getBrazilDateString();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [level, setLevel] = useState("all");
  const [appliedFilters, setAppliedFilters] = useState<{
    startDate: string;
    endDate: string;
    level: string;
  } | null>(null);

  const getLogsFn = useServerFn(listSystemLogs);
  const logExportFn = useServerFn(logLogsExport);

  const {
    data: logs = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["system-logs", appliedFilters],
    queryFn: () => (appliedFilters ? getLogsFn({ data: appliedFilters }) : Promise.resolve([])),
    enabled: Boolean(appliedFilters),
  });

  const handleApplyFilter = () => {
    setAppliedFilters({ startDate, endDate, level });
  };

  const handleExportCSV = async () => {
    if (!appliedFilters || logs.length === 0) {
      return toast.warning("Nenhum log para exportar no período selecionado.");
    }

    const headers = ["Data e Hora", "Nível", "Categoria", "Mensagem", "Usuário", "Detalhes"];
    const rows = logs.map((l: SystemLogEntry) => [
      new Date(l.created_at).toLocaleString("pt-BR", { timeZone: "America/Belem" }),
      l.level.toUpperCase(),
      l.category,
      l.message,
      l.user_id || "Sistema (Automático)",
      `"${(l.details || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(";"), ...rows.map((e: string[]) => e.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `logs_sistema_petruz_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    try {
      await logExportFn({
        data: {
          count: logs.length,
          startDate: appliedFilters.startDate,
          endDate: appliedFilters.endDate,
          level: appliedFilters.level,
        },
      });
      toast.success(`${logs.length} logs exportados com sucesso!`);
    } catch (e) {
      console.error("Falha ao registrar auditoria dos logs:", e);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">Auditoria & Logs do Sistema</CardTitle>
              <CardDescription>
                Monitore eventos de segurança, disparos do cron, erros de integração e histórico de
                atividades.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={!appliedFilters || logs.length === 0}
                className="h-9 gap-1.5"
              >
                <Download className="size-4" />
                Exportar CSV ({logs.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={!appliedFilters || isFetching}
                className="h-9 gap-1.5"
              >
                <RotateCcw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input
                type="date"
                className="w-[140px] h-9"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input
                type="date"
                className="w-[140px] h-9"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Nível</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Aviso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleApplyFilter} className="h-9 gap-1.5">
              <Filter className="size-4" /> Filtrar
            </Button>
          </div>

          {/* Logs Table */}
          {!appliedFilters ? (
            <div className="flex flex-col items-center justify-center min-h-[220px] gap-2 p-8 border border-dashed rounded-lg text-center bg-muted/10">
              <Filter className="size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">Consulta de Logs sob Demanda</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Selecione o período e o nível nos campos acima e clique no botão{" "}
                <strong>Filtrar</strong> para carregar os registros de log.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[250px] gap-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando logs do sistema...</p>
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden bg-card">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Data / Hora</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum registro de log encontrado para o período selecionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((l: SystemLogEntry) => (
                      <TableRow key={l.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {formatLocalizedDateTime(l.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              l.level === "error"
                                ? "bg-rose-500/10 text-rose-600 border-rose-500/20 font-bold"
                                : l.level === "warn"
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold"
                                  : "bg-blue-500/10 text-blue-600 border-blue-500/20 font-normal"
                            }
                          >
                            {l.level.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-xs font-mono">
                          {l.category}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground max-w-[400px] truncate">
                          {l.message || String(l.details ?? "—")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
