import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";
import type { Granularity } from "@/core/utils/date.utils";

interface SalesFiltersProps {
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
  day: string;
  onDayChange: (d: string) => void;
  week: string;
  onWeekChange: (w: string) => void;
  month: string;
  onMonthChange: (m: string) => void;
  year: string;
  onYearChange: (y: string) => void;
  from: string;
  onFromChange: (f: string) => void;
  to: string;
  onToChange: (t: string) => void;
  onFilter: () => void;
  isLoading?: boolean;
}

export function SalesFilters({
  granularity,
  onGranularityChange,
  day,
  onDayChange,
  week,
  onWeekChange,
  month,
  onMonthChange,
  year,
  onYearChange,
  from,
  onFromChange,
  to,
  onToChange,
  onFilter,
  isLoading,
}: SalesFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 w-full">
      <div className="space-y-1 w-full sm:w-auto">
        <Label className="text-xs text-muted-foreground">Filtro de Período</Label>
        <Select
          value={granularity}
          onValueChange={(val) => onGranularityChange(val as Granularity)}
        >
          <SelectTrigger className="w-full sm:w-[180px] h-9">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Diário</SelectItem>
            <SelectItem value="week">Semanal</SelectItem>
            <SelectItem value="month">Mensal</SelectItem>
            <SelectItem value="year">Anual</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
            <SelectItem value="failed" className="text-rose-600 dark:text-rose-400 font-medium">
              ⚠️ Envios com Falha
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {granularity === "failed" && (
        <div className="flex items-center text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-md border border-border/60 h-9 w-full sm:w-auto">
          Busca todas as notas que falharam no envio para você disparar novamente após corrigir no
          SAP.
        </div>
      )}

      {granularity === "day" && (
        <div className="space-y-1 w-full sm:w-auto">
          <Label className="text-xs text-muted-foreground">Data</Label>
          <Input
            type="date"
            className="w-full sm:w-[150px] h-9"
            value={day}
            onChange={(e) => onDayChange(e.target.value)}
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
            onChange={(e) => onWeekChange(e.target.value)}
          />
        </div>
      )}

      {granularity === "month" && (
        <div className="space-y-1 w-full sm:w-auto">
          <Label className="text-xs text-muted-foreground">Mês</Label>
          <Input
            type="month"
            className="w-full sm:w-[150px] h-9"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
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
            className="w-full sm:w-[110px] h-9"
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
          />
        </div>
      )}

      {granularity === "custom" && (
        <>
          <div className="space-y-1 w-full sm:w-auto">
            <Label className="text-xs text-muted-foreground">Data Inicial</Label>
            <Input
              type="date"
              className="w-full sm:w-[140px] h-9"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
            />
          </div>
          <div className="space-y-1 w-full sm:w-auto">
            <Label className="text-xs text-muted-foreground">Data Final</Label>
            <Input
              type="date"
              className="w-full sm:w-[140px] h-9"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
            />
          </div>
        </>
      )}

      <Button
        type="button"
        onClick={onFilter}
        disabled={isLoading}
        className="h-9 gap-1.5 font-medium shadow-sm w-full sm:w-auto"
      >
        <Filter className="size-4" />
        {granularity === "failed" ? "Buscar Envios com Falha" : "Filtrar Notas Fiscais"}
      </Button>
    </div>
  );
}
