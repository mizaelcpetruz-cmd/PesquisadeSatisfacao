import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  createSchedule,
  toggleSchedule,
  updateScheduleTime,
  deleteSchedule,
} from "../schedules.functions";
import { ScheduleModal } from "./ScheduleModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, CalendarClock, Clock, Loader2 } from "lucide-react";
import { formatLocalizedDateTime } from "@/core/utils/date.utils";
import type { ScheduleItem } from "../types";

export function SchedulesView() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const createSchFn = useServerFn(createSchedule);
  const toggleSchFn = useServerFn(toggleSchedule);
  const updateTimeFn = useServerFn(updateScheduleTime);
  const deleteSchFn = useServerFn(deleteSchedule);

  // 1. Query Schedules
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["schedules-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*, message_templates(id, name)")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as ScheduleItem[];
    },
  });

  // 2. Query Active Message Templates for modal
  const { data: templates = [] } = useQuery({
    queryKey: ["templates-min-list"],
    queryFn: async () => {
      const { data } = await supabase.from("message_templates").select("id, name").order("name");
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });

  // 3. Create Mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      period: string;
      templateId: string;
      runTime: string;
    }) => {
      return createSchFn({ data });
    },
    onSuccess: () => {
      toast.success("Agendamento criado com sucesso!");
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ["schedules-list"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erro ao criar agendamento.";
      toast.error(msg);
    },
  });

  // 4. Toggle Enabled
  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      return toggleSchFn({ data: { id, enabled } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules-list"] });
    },
  });

  // 5. Update Time
  const updateTimeMutation = useMutation({
    mutationFn: async ({ id, runTime }: { id: string; runTime: string }) => {
      return updateTimeFn({ data: { id, runTime } });
    },
    onSuccess: () => {
      toast.success("Horário atualizado com sucesso.");
      qc.invalidateQueries({ queryKey: ["schedules-list"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar horário.";
      toast.error(msg);
    },
  });

  // 6. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteSchFn({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Agendamento removido.");
      qc.invalidateQueries({ queryKey: ["schedules-list"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erro ao remover agendamento.";
      toast.error(msg);
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Deseja realmente remover o agendamento "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agendamentos Automáticos</h1>
          <p className="text-sm text-muted-foreground">
            Configure rotinas diárias automáticas para disparar pesquisas de satisfação para notas
            faturadas no SAP.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="h-9 gap-1.5 font-medium shadow-sm">
          <Plus className="size-4" />
          Novo Agendamento
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando rotinas agendadas...</p>
        </div>
      ) : schedules.length === 0 ? (
        <Card className="border-dashed border-border/80">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <div className="p-3 rounded-full bg-primary/10">
              <CalendarClock className="size-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Nenhum agendamento ativo</h3>
              <p className="text-sm text-muted-foreground">
                Crie um agendamento para automatizar os disparos diários de pesquisa de satisfação.
              </p>
            </div>
            <Button onClick={() => setModalOpen(true)} size="sm" className="gap-1">
              <Plus className="size-4" /> Criar Primeiro Agendamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {schedules.map((sch) => (
            <Card
              key={sch.id}
              className="shadow-sm border-border/60 hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">{sch.name}</CardTitle>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant={sch.enabled ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {sch.enabled ? "Ativo" : "Pausado"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-medium">
                        {(() => {
                          if (sch.period === "yesterday") return "Ontem (Vendas D-1)";
                          if (sch.period === "day") return "Hoje (Vendas D-0)";
                          if (sch.period.startsWith("week:")) {
                            const d = sch.period.split(":")[1];
                            const map: Record<string, string> = {
                              "1": "Toda Segunda-feira",
                              "2": "Toda Terça-feira",
                              "3": "Toda Quarta-feira",
                              "4": "Toda Quinta-feira",
                              "5": "Toda Sexta-feira",
                            };
                            return map[d] || "Semanal";
                          }
                          if (sch.period === "week") return "Toda Sexta-feira";
                          if (sch.period.startsWith("month:")) {
                            const d = sch.period.split(":")[1];
                            return `Todo dia ${d} do mês`;
                          }
                          if (sch.period === "month") return "Mensal";
                          return sch.period;
                        })()}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={sch.enabled}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: sch.id, enabled: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(sch.id, sch.name)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="space-y-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-md border border-border/40">
                  <div className="flex justify-between items-center">
                    <span>Modelo vinculado:</span>
                    <span className="font-semibold text-foreground">
                      {sch.message_templates?.name || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Horário diário:</span>
                    <Input
                      type="time"
                      defaultValue={sch.run_time || "09:00"}
                      onBlur={(e) => {
                        if (e.target.value !== sch.run_time) {
                          updateTimeMutation.mutate({ id: sch.id, runTime: e.target.value });
                        }
                      }}
                      className="w-[100px] h-7 text-xs font-mono"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-border/40 text-[11px]">
                    <span>Último disparo:</span>
                    <span className="font-mono">{formatLocalizedDateTime(sch.last_run_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule Create Modal */}
      <ScheduleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        templates={templates}
        onSave={async (data) => {
          await createMutation.mutateAsync(data);
        }}
        isSaving={createMutation.isPending}
      />
    </div>
  );
}
