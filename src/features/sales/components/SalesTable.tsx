import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Ban } from "lucide-react";
import { formatLocalizedDate } from "@/core/utils/date.utils";
import { formatDisplayPhone, validateAndFormatE164Mobile } from "@/core/utils/phone.utils";
import type { SaleRow } from "@/integrations/sap/sap.types";

interface SalesTableProps {
  sales: SaleRow[];
  selected: Set<number>;
  onToggleSelect: (docEntry: number) => void;
  onToggleSelectAll: () => void;
  onRefreshContact?: (cardCode: string) => void;
  refreshingCardCode?: string | null;
}

export function SalesTable({
  sales,
  selected,
  onToggleSelect,
  onToggleSelectAll,
  onRefreshContact,
  refreshingCardCode,
}: SalesTableProps) {
  const allSelected = sales.length > 0 && selected.size === sales.length;

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[48px] text-center">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleSelectAll}
                aria-label="Selecionar todas as notas"
              />
            </TableHead>
            <TableHead>Nº Nota Fiscal (NF-e)</TableHead>
            <TableHead className="w-[70px] text-center">Filial</TableHead>
            <TableHead>Data Emissão</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Telefone (WhatsApp)</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                Nenhuma Nota Fiscal de Saída encontrada para o período selecionado no SAP B1.
              </TableCell>
            </TableRow>
          ) : (
            sales.map((s) => {
              const isChecked = selected.has(s.docEntry);
              const isRefreshing = refreshingCardCode === s.cardCode;
              const isOptOut = s.recebePesquisa === "0" || s.recebePesquisa === 0;
              const phoneValidation = validateAndFormatE164Mobile(s.phone);

              return (
                <TableRow
                  key={s.docEntry}
                  className={`cursor-pointer transition-colors ${
                    isOptOut ? "opacity-60 bg-muted/20" : isChecked ? "bg-primary/5" : ""
                  }`}
                  onClick={() => onToggleSelect(s.docEntry)}
                >
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => onToggleSelect(s.docEntry)}
                    />
                  </TableCell>
                  <TableCell className="font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span>{s.docNum}</span>
                      {s.surveyStatus === "sent" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4 font-normal bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          title="Pesquisa já enviada com sucesso"
                        >
                          Enviada
                        </Badge>
                      )}
                      {s.surveyStatus === "answered" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4 font-normal bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                          title="Pesquisa respondida pelo cliente"
                        >
                          Respondida
                        </Badge>
                      )}
                      {s.surveyStatus === "failed" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4 font-normal bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          title="Disparo anterior falhou"
                        >
                          Falha
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono font-medium text-sm">
                    {s.bplId ?? 1}
                  </TableCell>
                  <TableCell className="text-sm">{formatLocalizedDate(s.docDate)}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      {s.cardName}
                      {isOptOut && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] px-1.5 py-0 h-4 font-normal bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        >
                          <Ban className="size-2.5 mr-1" /> Opt-Out
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.cardCode}</div>
                  </TableCell>
                  <TableCell className="text-sm">{s.contactName || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {s.phone && phoneValidation.valid ? (
                        <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded whitespace-nowrap">
                          {formatDisplayPhone(s.phone)}
                        </span>
                      ) : s.phone ? (
                        <div
                          className="flex items-center gap-1.5"
                          title={phoneValidation.error || "Telefone com formato inválido"}
                        >
                          <span className="text-xs font-mono text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded whitespace-nowrap">
                            {s.phone}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1 text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20 whitespace-nowrap"
                          >
                            {phoneValidation.error?.includes("sem DDD")
                              ? "Falta DDD"
                              : phoneValidation.isLandline
                                ? "Fixo"
                                : "Inválido"}
                          </Badge>
                        </div>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs text-rose-500 bg-rose-500/10 border-rose-500/20 whitespace-nowrap"
                        >
                          Sem telefone
                        </Badge>
                      )}
                      {onRefreshContact && (
                        <button
                          type="button"
                          title="Recarregar telefone do SAP (após alteração)"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRefreshContact(s.cardCode);
                          }}
                          disabled={isRefreshing}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <RefreshCw
                            className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`}
                          />
                        </button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.salespersonName || "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium text-sm">
                    {s.docTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
