import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Clock, Calendar, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { isCommercialHour } from "@/core/utils/date.utils";

interface ScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Array<{ id: string; name: string }>;
  onSave: (data: {
    name: string;
    period: string;
    templateId: string;
    runTime: string;
  }) => Promise<void>;
  isSaving: boolean;
}

const PERIOD_TYPES = [
  { value: "yesterday", label: "Vendas do Dia Anterior (Ontem)" },
  { value: "day", label: "Vendas do Dia Atual" },
  { value: "week", label: "Vendas da Semana Vigente" },
  { value: "month", label: "Vendas do Mês Atual" },
];

const WEEKDAYS = [
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
];

export function ScheduleModal({
  open,
  onOpenChange,
  templates,
  onSave,
  isSaving,
}: ScheduleModalProps) {
  const [name, setName] = useState("");
  const [periodType, setPeriodType] = useState("yesterday");
  const [weekday, setWeekday] = useState("5"); // Default: Sexta-feira
  const [monthDay, setMonthDay] = useState("20"); // Default: Dia 20
  const [templateId, setTemplateId] = useState("");
  const [runTime, setRunTime] = useState("09:00");

  const isTimeValid = useMemo(() => isCommercialHour(runTime), [runTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateId) {
      return toast.warning("Selecione um modelo de mensagem.");
    }

    if (!isTimeValid) {
      return toast.error("O horário deve ser estritamente em horário comercial (entre 08:00 e 18:00).");
    }

    let encodedPeriod = periodType;
    if (periodType === "week") {
      encodedPeriod = `week:${weekday}`;
    } else if (periodType === "month") {
      encodedPeriod = `month:${monthDay}`;
    }

    await onSave({ name, period: encodedPeriod, templateId, runTime });
    setName("");
    setPeriodType("yesterday");
    setWeekday("5");
    setMonthDay("20");
    setRunTime("09:00");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b border-border/50 shrink-0">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="size-5 text-primary" /> Novo Agendamento Automático
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="sch-name">Nome do Agendamento</Label>
              <Input
                id="sch-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Disparo Semanal Toda Sexta ou Vendas Ontem"
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Período de Vendas SAP a Consultar</Label>
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_TYPES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Configuração de Dia da Semana (somente Segunda a Sexta) */}
            {periodType === "week" && (
              <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3.5">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Calendar className="size-3.5" /> Dia da Semana para Envio
                  </Label>
                  <Select value={weekday} onValueChange={setWeekday}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione o dia da semana" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((w) => (
                        <SelectItem key={w.value} value={w.value}>
                          Toda {w.label} (Dias Úteis)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Disparos semanais são restritos a dias úteis. Caso a data coincida com um feriado nacional, o disparo não será realizado.
                  </p>
                </div>
              </div>
            )}

            {/* Configuração de Dia do Mês (1 a 31) */}
            {periodType === "month" && (
              <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3.5">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Calendar className="size-3.5" /> Dia do Mês para Envio
                  </Label>
                  <Select value={monthDay} onValueChange={setMonthDay}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione o dia do mês" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
                        <SelectItem key={d} value={d}>
                          Todo dia {d} do mês
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Se o dia selecionado cair em final de semana ou feriado nacional, o sistema ignora o disparo por conformidade operacional.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label>Modelo de Mensagem</Label>
              <Select value={templateId} onValueChange={setTemplateId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo de mensagem" />
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

            <div className="space-y-1.5">
              <Label htmlFor="sch-time" className="flex items-center justify-between">
                <span>Horário de Execução</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  (Horário Comercial: 08:00 às 18:00)
                </span>
              </Label>
              <div className="relative">
                <Input
                  id="sch-time"
                  type="time"
                  min="08:00"
                  max="18:00"
                  value={runTime}
                  onChange={(e) => setRunTime(e.target.value)}
                  className={`font-mono text-sm ${!isTimeValid ? "border-destructive text-destructive" : ""}`}
                  required
                />
              </div>

              {!isTimeValid ? (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1 font-medium">
                  <AlertCircle className="size-3.5 shrink-0" />
                  Horário fora do intervalo comercial. Escolha entre 08:00 e 18:00.
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  O robô iniciará os disparos a partir deste horário no fuso de Belém (UTC-3).
                </p>
              )}
            </div>

            {/* Business Rules Security Banner */}
            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground space-y-1">
              <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="size-4" /> Regras Operacionais Aplicadas:
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>Disparos ocorrem <strong>apenas em dias úteis</strong> (Segunda a Sexta).</li>
                <li><strong>Finais de semana e feriados nacionais</strong> são bloqueados automaticamente.</li>
                <li>Envios restritos ao <strong>horário comercial (08:00 às 18:00)</strong>.</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="p-4 pt-3 border-t border-border/50 bg-muted/20 shrink-0 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || !templateId || !isTimeValid}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar Agendamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
