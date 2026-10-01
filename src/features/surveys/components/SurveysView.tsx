import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  logCsvExport,
  resendSurvey,
  syncClientContactFromSap,
  syncAllFailedContactsFromSap,
} from "../surveys.functions";
import { SurveysTable } from "./SurveysTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Search,
  RotateCcw,
  Loader2,
  Filter,
  CalendarSearch,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  getBrazilDateString,
  getISOWeekString,
  resolveDateRange,
  type Granularity,
} from "@/core/utils/date.utils";
import type { SurveyRecord } from "../types";

export function SurveysView() {
  const [hasFiltered, setHasFiltered] = useState(false);
  const [statusTab, setStatusTab] = useState("all");

  // Date Filter State
  const [granularity, setGranularity] = useState<Granularity | "all">("day");
  const [day, setDay] = useState(() => getBrazilDateString());
  const [week, setWeek] = useState(() => getISOWeekString());
  const [month, setMonth] = useState(() => getBrazilDateString().slice(0, 7));
  const [year, setYear] = useState(() => getBrazilDateString().slice(0, 4));
  const [from, setFrom] = useState(() => getBrazilDateString());
  const [to, setTo] = useState(() => getBrazilDateString());

  // Search and Branch Filter State
  const [draftSearch, setDraftSearch] = useState("");
  const [draftBplFilter, setDraftBplFilter] = useState("all");

  const [appliedFilters, setAppliedFilters] = useState<{
    granularity: Granularity | "all";
    range: { from: string; to: string } | null;
    search: string;
    bplFilter: string;
  }>({
    granularity: "day",
    range: null,
    search: "",
    bplFilter: "all",
  });

  const [resendingId, setResendingId] = useState<string | null>(null);
  const [syncingCardCode, setSyncingCardCode] = useState<string | null>(null);
  const [isSyncingAllFailed, setIsSyncingAllFailed] = useState(false);

  const logExportFn = useServerFn(logCsvExport);
  const resendSurveyFn = useServerFn(resendSurvey);
  const syncContactFn = useServerFn(syncClientContactFromSap);
  const syncAllFailedContactsFn = useServerFn(syncAllFailedContactsFromSap);

  const handleResend = async (surveyId: string) => {
    setResendingId(surveyId);
    try {
      const res = await resendSurveyFn({ data: { surveyId } });
      toast.success(`Pesquisa reenviada com sucesso para ${res.phone}!`);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao reenviar pesquisa.";
      toast.error(msg);
      refetch();
    } finally {
      setResendingId(null);
    }
  };

  const handleRefreshContact = async (cardCode: string) => {
    setSyncingCardCode(cardCode);
    try {
      const res = await syncContactFn({ data: { cardCode } });
      toast.success(
        `Contato atualizado do SAP (${res.phone || "sem celular"}). Todas as pesquisas deste cliente foram sincronizadas!`,
      );
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao sincronizar contato do SAP";
      toast.error(msg);
    } finally {
      setSyncingCardCode(null);
    }
  };

  const handleSyncAllFailed = async () => {
    const failedCards = Array.from(
      new Set(
        dateAndSearchFiltered
          .filter((s) => s.status === "failed")
          .map((s) => s.card_code)
          .filter(Boolean),
      ),
    ) as string[];

    setIsSyncingAllFailed(true);
    try {
      const res = await syncAllFailedContactsFn({
        data: { cardCodes: failedCards.length > 0 ? failedCards : undefined },
      });
      if (res.updated > 0) {
        toast.success(
          `${res.updated} clientes consultados no SAP e números atualizados em todas as vendas!`,
        );
      } else {
        toast.info("Nenhum cliente com falha para atualizar do SAP.");
      }
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao buscar contatos do SAP.";
      toast.error(msg);
    } finally {
      setIsSyncingAllFailed(false);
    }
  };

  // 1. Fetch Environment & Surveys from Supabase
  const {
    data: surveys = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["surveys-list"],
    queryFn: async () => {
      const { data: settings } = await supabase
        .from("app_settings")
        .select("current_environment")
        .eq("id", 1)
        .maybeSingle();
      const currentEnv = settings?.current_environment || "test";

      const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("environment", currentEnv)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as SurveyRecord[];
    },
  });

  // 2. Extract unique branch numbers for branch filter
  const branchOptions = Array.from(
    new Set(surveys.map((s) => String(s.bpl_id ?? 1))),
  ).sort((a, b) => Number(a) - Number(b));

  const getActiveRef = (): string => {
    if (granularity === "day") return day;
    if (granularity === "week") return week;
    if (granularity === "month") return month;
    if (granularity === "year") return year;
    return from;
  };

  const handleApplyFilters = () => {
    let computedRange: { from: string; to: string } | null = null;
    if (granularity === "all") {
      computedRange = null;
    } else if (granularity === "custom") {
      computedRange = { from, to };
    } else {
      computedRange = resolveDateRange(granularity, getActiveRef());
    }

    setAppliedFilters({
      granularity,
      range: computedRange,
      search: draftSearch.trim(),
      bplFilter: draftBplFilter,
    });
    setHasFiltered(true);
  };

  const handleResetFilters = () => {
    setGranularity("day");
    setDay(getBrazilDateString());
    setDraftSearch("");
    setDraftBplFilter("all");
    setAppliedFilters({
      granularity: "day",
      range: null,
      search: "",
      bplFilter: "all",
    });
    setStatusTab("all");
    setHasFiltered(false);
  };

  // 3. Filter in memory based on applied date range, search query, branch and status tab
  const dateAndSearchFiltered = surveys.filter((s) => {
    if (!hasFiltered) return false;

    // Date range filter: matches either invoice_date (DocDate) OR created_at
    if (appliedFilters.range) {
      const { from: rFrom, to: rTo } = appliedFilters.range;
      const invDate = s.invoice_date ? s.invoice_date.slice(0, 10) : "";
      const createdDate = s.created_at ? s.created_at.slice(0, 10) : "";

      const matchInvoice = Boolean(invDate && invDate >= rFrom && invDate <= rTo);
      const matchCreated = Boolean(createdDate && createdDate >= rFrom && createdDate <= rTo);

      if (!matchInvoice && !matchCreated) {
        return false;
      }
    }

    // Branch filter
    if (appliedFilters.bplFilter !== "all") {
      const bNum = String(s.bpl_id ?? 1);
      if (bNum !== appliedFilters.bplFilter) return false;
    }

    // Text Search filter (Client, NF, Phone, Contact, Salesperson)
    if (appliedFilters.search) {
      const q = appliedFilters.search.toLowerCase();
      const matchCard =
        s.card_name?.toLowerCase().includes(q) || s.card_code?.toLowerCase().includes(q);
      const matchDoc = String(s.sap_doc_num || "").includes(q);
      const matchContact = s.contact_name?.toLowerCase().includes(q);
      const matchPhone = s.phone?.toLowerCase().includes(q);
      const matchSeller = s.salesperson_name?.toLowerCase().includes(q);
      if (!matchCard && !matchDoc && !matchContact && !matchPhone && !matchSeller) {
        return false;
      }
    }

    return true;
  });

  // Filter further by Status Tab
  const tabFiltered = dateAndSearchFiltered.filter((s) => {
    if (statusTab === "pending" && s.status !== "pending") return false;
    if (statusTab === "sent" && s.status !== "sent") return false;
    if (statusTab === "answered" && s.status !== "answered") return false;
    if (statusTab === "failed" && s.status !== "failed") return false;
    return true;
  });

  const countAll = dateAndSearchFiltered.length;
  const countAnswered = dateAndSearchFiltered.filter((s) => s.status === "answered").length;
  const countSent = dateAndSearchFiltered.filter((s) => s.status === "sent").length;
  const countPending = dateAndSearchFiltered.filter((s) => s.status === "pending").length;
  const countFailed = dateAndSearchFiltered.filter((s) => s.status === "failed").length;

  // 4. CSV Export Handler
  const handleExportCSV = async () => {
    if (tabFiltered.length === 0) {
      return toast.warning("Nenhum registro para exportar com os filtros atuais.");
    }

    const headers = [
      "Data e Horário",
      "NF",
      "Filial",
      "Cod Cliente",
      "Cliente",
      "Contato",
      "Telefone (WhatsApp)",
      "Status",
      "Nota",
      "Comentário / Detalhes de Erro",
      "Vendedor",
    ];

    const rows = tabFiltered.map((s) => [
      new Date(s.created_at).toLocaleString("pt-BR", { timeZone: "America/Belem" }),
      s.sap_doc_num ?? "",
      s.bpl_id ?? 1,
      s.card_code ?? "",
      `"${(s.card_name || "").replace(/"/g, '""')}"`,
      `"${(s.contact_name || "").replace(/"/g, '""')}"`,
      s.phone ?? "",
      s.status,
      s.score ?? "",
      `"${(s.comment || s.error_message || "").replace(/"/g, '""')}"`,
      `"${(s.salesperson_name || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `pesquisas_satisfacao_petruz_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    try {
      await logExportFn({
        data: {
          count: tabFiltered.length,
          dateFrom: appliedFilters.range?.from,
          dateTo: appliedFilters.range?.to,
          statusFilter: statusTab,
        },
      });
      toast.success(`${tabFiltered.length} registros exportados com sucesso!`);
    } catch (e) {
      console.error("Falha ao registrar auditoria do CSV:", e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Histórico de Pesquisas</h1>
          <p className="text-sm text-muted-foreground">
            Consulte os disparos de pesquisas por data ou período, acompanhe feedbacks e reenvie mensagens que falharam.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasFiltered && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={tabFiltered.length === 0}
              className="h-9 gap-1.5 font-medium shadow-sm"
            >
              <Download className="size-4" />
              Exportar CSV ({tabFiltered.length})
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              refetch();
              toast.info("Histórico de pesquisas atualizado.");
            }}
            disabled={isFetching}
            className="h-9 gap-1.5"
          >
            <RotateCcw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-semibold">
            Parâmetros de Consulta de Pesquisas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Period Selector */}
            <div className="space-y-1 w-full sm:w-auto">
              <Label className="text-xs text-muted-foreground">Filtro de Período</Label>
              <Select
                value={granularity}
                onValueChange={(val) => setGranularity(val as Granularity | "all")}
              >
                <SelectTrigger className="w-full sm:w-[170px] h-9">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Diário</SelectItem>
                  <SelectItem value="week">Semanal</SelectItem>
                  <SelectItem value="month">Mensal</SelectItem>
                  <SelectItem value="year">Anual</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                  <SelectItem value="all">Todas as Datas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {granularity === "day" && (
              <div className="space-y-1 w-full sm:w-auto">
                <Label className="text-xs text-muted-foreground">Data</Label>
                <Input
                  type="date"
                  className="w-full sm:w-[150px] h-9"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                />
              </div>
            )}

            {granularity === "week" && (
              <div className="space-y-1 w-full sm:w-auto">
                <Label className="text-xs text-muted-foreground">Semana</Label>
                <Input
                  type="week"
                  className="w-full sm:w-[160px] h-9"
                  value={week}
                  onChange={(e) => setWeek(e.target.value)}
                />
              </div>
            )}

            {granularity === "month" && (
              <div className="space-y-1 w-full sm:w-auto">
                <Label className="text-xs text-muted-foreground">Mês</Label>
                <Input
                  type="month"
                  className="w-full sm:w-[160px] h-9"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </div>
            )}

            {granularity === "year" && (
              <div className="space-y-1 w-full sm:w-auto">
                <Label className="text-xs text-muted-foreground">Ano</Label>
                <Input
                  type="number"
                  min="2020"
                  max="2035"
                  className="w-full sm:w-[120px] h-9"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>
            )}

            {granularity === "custom" && (
              <>
                <div className="space-y-1 w-full sm:w-auto">
                  <Label className="text-xs text-muted-foreground">De</Label>
                  <Input
                    type="date"
                    className="w-full sm:w-[140px] h-9"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1 w-full sm:w-auto">
                  <Label className="text-xs text-muted-foreground">Até</Label>
                  <Input
                    type="date"
                    className="w-full sm:w-[140px] h-9"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Branch Selector */}
            {branchOptions.length > 0 && (
              <div className="space-y-1 w-full sm:w-auto">
                <Label className="text-xs text-muted-foreground">Filial</Label>
                <Select value={draftBplFilter} onValueChange={setDraftBplFilter}>
                  <SelectTrigger className="w-full sm:w-[150px] h-9">
                    <SelectValue placeholder="Todas as filiais" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as filiais</SelectItem>
                    {branchOptions.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Quick Search */}
            <div className="space-y-1 flex-1 min-w-[200px] w-full sm:w-auto">
              <Label className="text-xs text-muted-foreground">Busca Rápida</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cliente, NF, Contato, Telefone..."
                  value={draftSearch}
                  onChange={(e) => setDraftSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                  className="pl-8 h-9 w-full"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <Button
              type="button"
              onClick={handleApplyFilters}
              className="h-9 gap-1.5 font-medium shadow-sm w-full sm:w-auto"
            >
              <Filter className="size-4" /> Filtrar Pesquisas
            </Button>

            {hasFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 text-xs text-muted-foreground hover:text-foreground w-full sm:w-auto"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content Area */}
      {!hasFiltered ? (
        <Card className="border-dashed border-2 py-12 text-center bg-card/40">
          <CardContent className="flex flex-col items-center justify-center space-y-3">
            <div className="rounded-full bg-primary/10 p-4 text-primary">
              <CalendarSearch className="size-8" />
            </div>
            <h3 className="text-lg font-semibold">Consulte o Histórico de Pesquisas</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Selecione o filtro de período ou informe a data desejada acima e clique no botão{" "}
              <strong className="text-foreground">"Filtrar Pesquisas"</strong> para visualizar os registros de envio, respostas e falhas.
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando histórico de pesquisas...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status Tabs */}
          <div className="overflow-x-auto pb-1">
            <Tabs value={statusTab} onValueChange={setStatusTab}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <TabsList className="flex flex-wrap sm:grid sm:grid-cols-5 w-full max-w-3xl h-auto p-1 gap-1">
                  <TabsTrigger value="all" className="flex-1 min-w-[80px]">
                    Todas ({countAll})
                  </TabsTrigger>
                  <TabsTrigger value="answered" className="flex-1 min-w-[90px]">
                    Respondidas ({countAnswered})
                  </TabsTrigger>
                  <TabsTrigger value="sent" className="flex-1 min-w-[80px]">
                    Enviadas ({countSent})
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="flex-1 min-w-[80px]">
                    Pendentes ({countPending})
                  </TabsTrigger>
                  <TabsTrigger
                    value="failed"
                    className={`flex-1 min-w-[80px] ${
                      countFailed > 0 ? "text-rose-600 dark:text-rose-400 font-semibold" : ""
                    }`}
                  >
                    {countFailed > 0 ? `⚠️ Falhas (${countFailed})` : `Falhas (${countFailed})`}
                  </TabsTrigger>
                </TabsList>

                {countFailed > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncAllFailed}
                    disabled={isSyncingAllFailed}
                    className="h-9 gap-1.5 font-medium border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shadow-sm whitespace-nowrap self-start sm:self-auto"
                    title="Consulta e recarrega os telefones atualizados no cadastro do SAP para todos os clientes dos envios que falharam"
                  >
                    <RefreshCw className={`size-4 ${isSyncingAllFailed ? "animate-spin" : ""}`} />
                    {isSyncingAllFailed ? "Buscando no SAP..." : `Recarregar Telefones do SAP (${countFailed})`}
                  </Button>
                )}
              </div>
            </Tabs>
          </div>

          {/* Table */}
          <SurveysTable
            surveys={tabFiltered}
            onResend={handleResend}
            resendingId={resendingId}
            onRefreshContact={handleRefreshContact}
            refreshingCardCode={syncingCardCode}
          />
        </div>
      )}
    </div>
  );
}
