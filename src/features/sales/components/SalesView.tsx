import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { fetchClosedSales, refreshSingleContact } from "../sales.functions";
import { sendSurveys } from "@/features/surveys/surveys.functions";
import { SalesFilters } from "./SalesFilters";
import { SalesTable } from "./SalesTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Send, RefreshCcw, Filter, ListOrdered } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getBrazilDateString,
  getISOWeekString,
  resolveDateRange,
  type Granularity,
} from "@/core/utils/date.utils";
import type { SaleRow } from "@/integrations/sap/sap.types";

export function SalesView() {
  const qc = useQueryClient();
  const today = getBrazilDateString();
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [day, setDay] = useState(today);
  const [week, setWeek] = useState(() => getISOWeekString(new Date()));
  const [month, setMonth] = useState(today.slice(0, 7));
  const [year, setYear] = useState(today.slice(0, 4));
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const [appliedRange, setAppliedRange] = useState<{ from: string; to: string } | null>(null);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [templateId, setTemplateId] = useState<string>("");
  const [refreshingCardCode, setRefreshingCardCode] = useState<string | null>(null);

  const fetchSalesFn = useServerFn(fetchClosedSales);
  const refreshContactFn = useServerFn(refreshSingleContact);
  const sendSurveysFn = useServerFn(sendSurveys);

  const getActiveRef = () => {
    if (granularity === "day") return day;
    if (granularity === "week") return week;
    if (granularity === "month") return month;
    if (granularity === "year") return year;
    return from;
  };

  const handleFilter = () => {
    const computedRange =
      granularity === "custom" ? { from, to } : resolveDateRange(granularity, getActiveRef());
    setAppliedRange(computedRange);
  };

  // 1. Query Sales from SAP (on-demand when appliedRange is set, with forceFresh)
  const {
    data: sales = [],
    isLoading: isLoadingSales,
    isFetching: isFetchingSales,
    refetch,
    error: salesError,
  } = useQuery({
    queryKey: ["sap-sales", appliedRange?.from, appliedRange?.to],
    queryFn: () => fetchSalesFn({ data: { ...appliedRange!, forceFresh: true } }),
    enabled: Boolean(appliedRange),
  });

  const handleRefreshContact = async (cardCode: string) => {
    setRefreshingCardCode(cardCode);
    try {
      const updated = await refreshContactFn({ data: { cardCode } });
      qc.setQueryData<SaleRow[]>(
        ["sap-sales", appliedRange?.from, appliedRange?.to],
        (prev) =>
          prev?.map((s) =>
            s.cardCode === cardCode
              ? {
                  ...s,
                  phone: updated.phone,
                  contactName: updated.contactName ?? s.contactName,
                  email: updated.email ?? s.email,
                }
              : s,
          ) ?? [],
      );
      if (updated.phone) {
        toast.success(`Telefone atualizado do SAP: ${updated.phone}`);
      } else {
        toast.warning(`Cliente consultado no SAP, mas continua sem celular/WhatsApp cadastrado.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao recarregar contato do SAP";
      toast.error(msg);
    } finally {
      setRefreshingCardCode(null);
    }
  };

  // 2. Query Active Message Templates
  const { data: templates = [] } = useQuery({
    queryKey: ["message-templates-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("message_templates")
        .select("id, name, zenvia_template_id")
        .order("name");
      return (data ?? []) as Array<{ id: string; name: string; zenvia_template_id: string | null }>;
    },
  });

  useEffect(() => {
    if (!templateId && templates.length > 0) {
      const defaultTpl =
        templates.find((t) => t.name.toLowerCase().includes("pesquisa")) || templates[0];
      if (defaultTpl) setTemplateId(defaultTpl.id);
    }
  }, [templates, templateId]);

  // 3. Send Surveys Mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!templateId) throw new Error("Selecione um modelo de mensagem antes de enviar.");
      const selectedSales = sales.filter((s) => selected.has(s.docEntry));
      if (selectedSales.length === 0)
        throw new Error("Selecione ao menos uma venda para disparar.");

      return sendSurveysFn({
        data: {
          templateId,
          sales: selectedSales,
        },
      });
    },
    onSuccess: (res) => {
      const sentCount = res.filter((r) => r.status === "sent").length;
      const alreadySentCount = res.filter((r) => r.status === "already_sent").length;
      const failedCount = res.filter((r) => r.status === "failed").length;
      const optOutCount = res.filter((r) => r.status === "opt_out").length;

      if (sentCount > 0 && failedCount === 0 && alreadySentCount === 0 && optOutCount === 0) {
        toast.success(`Todas as ${sentCount} pesquisas foram enviadas com sucesso!`);
      } else if (alreadySentCount > 0 && sentCount === 0 && failedCount === 0 && optOutCount === 0) {
        toast.info(
          `${alreadySentCount} nota(s) já haviam sido enviadas anteriormente (disparo duplicado evitado). Consulte na aba 'Enviadas'.`,
        );
      } else {
        if (sentCount > 0) {
          toast.success(`${sentCount} pesquisa(s) enviada(s) com sucesso.`);
        }
        if (alreadySentCount > 0) {
          toast.info(`${alreadySentCount} nota(s) já haviam sido enviadas anteriormente.`);
        }
        if (failedCount > 0) {
          toast.error(
            `${failedCount} pesquisa(s) falharam no envio. Verifique na aba 'Falhas' do Histórico de Pesquisas.`,
          );
        }
        if (optOutCount > 0) {
          toast.warning(`${optOutCount} cliente(s) optaram por não receber pesquisas (Opt-Out).`);
        }
      }

      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      qc.invalidateQueries({ queryKey: ["surveys-list"] });
      qc.invalidateQueries({ queryKey: ["sap-sales"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erro ao disparar pesquisas.";
      toast.error(msg);
    },
  });

  const toggleSelect = (docEntry: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(docEntry)) next.delete(docEntry);
      else next.add(docEntry);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === sales.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sales.map((s) => s.docEntry)));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notas Fiscais de Saída (SAP B1)</h1>
          <p className="text-sm text-muted-foreground">
            Consulte as Notas Fiscais de Saída emitidas no SAP e envie pesquisas de satisfação por lote ou
            individualmente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (appliedRange) {
                refetch();
                toast.info("Recarregando notas e contatos diretamente do SAP...");
              } else {
                handleFilter();
              }
            }}
            disabled={isFetchingSales}
            className="h-9 gap-1.5"
            title="Recarrega todas as notas e contatos atualizados do SAP (limpando cache)"
          >
            <RefreshCcw className={`size-4 ${isFetchingSales ? "animate-spin text-primary" : ""}`} />
            Recarregar do SAP
          </Button>
        </div>
      </div>

      {/* Filter and Dispatch Card */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-semibold">
            Parâmetros de Consulta & Disparo
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <SalesFilters
              granularity={granularity}
              onGranularityChange={setGranularity}
              day={day}
              onDayChange={setDay}
              week={week}
              onWeekChange={setWeek}
              month={month}
              onMonthChange={setMonth}
              year={year}
              onYearChange={setYear}
              from={from}
              onFromChange={setFrom}
              to={to}
              onToChange={setTo}
              onFilter={handleFilter}
              isLoading={isFetchingSales}
            />

            {/* Template Selector & Send Action */}
            <div className="flex flex-wrap items-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/40">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Modelo de Mensagem</label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger className="w-[200px] h-9">
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => sendMutation.mutate()}
                disabled={selected.size === 0 || !templateId || sendMutation.isPending}
                className="h-9 gap-1.5 font-medium shadow-sm"
              >
                {sendMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Disparar ({selected.size})
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground bg-muted/30 px-3 py-1.5 rounded border border-border/40 flex items-center justify-between flex-wrap gap-2">
            <span>🕒 <strong>Horário Comercial Obrigatório:</strong> Disparos permitidos das <strong>08:00 às 18:00</strong> (fuso de Belém).</span>
            <span>📅 <strong>Dias Úteis:</strong> Segunda a Sexta-feira (bloqueado em feriados e finais de semana).</span>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      {!appliedRange ? (
        <Card className="shadow-sm border-dashed border-border/80">
          <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Filter className="size-8 text-muted-foreground/50 mb-1" />
            <p className="font-medium text-foreground">Nenhuma consulta realizada</p>
            <p className="text-xs max-w-sm">
              Selecione os parâmetros de período desejados acima e clique em{" "}
              <strong className="text-foreground">"Filtrar Notas Fiscais"</strong> para buscar as Notas Fiscais de Saída emitidas no SAP B1.
            </p>
          </CardContent>
        </Card>
      ) : isLoadingSales ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Consultando faturas e contatos no SAP Service Layer...
          </p>
        </div>
      ) : salesError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-6 text-center text-destructive text-sm font-medium flex flex-col items-center gap-2">
            <p>{salesError instanceof Error ? salesError.message : "Erro ao consultar SAP Service Layer."}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-1">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Índice / Resumo de Lançamentos */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/40 px-4 py-2.5 rounded-lg border border-border/60">
            <div className="flex items-center flex-wrap gap-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ListOrdered className="size-4 text-primary" />
                <span>Índice de Lançamentos:</span>
              </div>
              <Badge variant="secondary" className="font-mono text-xs font-bold px-2.5 py-0.5">
                {sales.length} {sales.length === 1 ? "lançamento encontrado" : "lançamentos encontrados"}
              </Badge>
              {selected.size > 0 ? (
                <Badge variant="outline" className="text-xs text-primary bg-primary/10 border-primary/30 font-medium">
                  {selected.size} {selected.size === 1 ? "selecionado para disparo" : "selecionados para disparo"}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">
                  (Nenhuma nota selecionada)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={toggleSelectAll}
                disabled={sales.length === 0}
              >
                {selected.size === sales.length && sales.length > 0
                  ? "Desmarcar Todos"
                  : `Selecionar Todos (${sales.length})`}
              </Button>
            </div>
          </div>

          <SalesTable
            sales={sales}
            selected={selected}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onRefreshContact={handleRefreshContact}
            refreshingCardCode={refreshingCardCode}
          />
        </div>
      )}
    </div>
  );
}
