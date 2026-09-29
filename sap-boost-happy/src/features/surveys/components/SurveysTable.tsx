import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Send, Loader2, RefreshCw } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { ScoreBadge } from "./ScoreBadge";
import { formatLocalizedDateTime } from "@/core/utils/date.utils";
import { formatDisplayPhone } from "@/core/utils/phone.utils";
import type { SurveyRecord } from "../types";

interface SurveysTableProps {
  surveys: SurveyRecord[];
  onResend?: (surveyId: string) => void;
  resendingId?: string | null;
  onRefreshContact?: (cardCode: string) => void;
  refreshingCardCode?: string | null;
}

export function SurveysTable({
  surveys,
  onResend,
  resendingId,
  onRefreshContact,
  refreshingCardCode,
}: SurveysTableProps) {
  return (
    <div className="rounded-md border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Data / Hora</TableHead>
            <TableHead>NF</TableHead>
            <TableHead className="w-[70px] text-center">Filial</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Telefone (WhatsApp)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Nota</TableHead>
            <TableHead>Feedback / Observações</TableHead>
            <TableHead>Vendedor</TableHead>
            {onResend && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {surveys.length === 0 ? (
            <TableRow>
              <TableCell colSpan={onResend ? 11 : 10} className="text-center py-8 text-muted-foreground">
                Nenhum registro de pesquisa encontrado para os filtros selecionados.
              </TableCell>
            </TableRow>
          ) : (
            surveys.map((s) => {
              const isResending = resendingId === s.id;
              const isRefreshing = refreshingCardCode === s.card_code;

              return (
                <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {formatLocalizedDateTime(s.created_at)}
                  </TableCell>
                  <TableCell className="font-semibold">{s.sap_doc_num ?? "—"}</TableCell>
                  <TableCell className="text-center font-mono font-medium text-sm">
                    {s.bpl_id ?? 1}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{s.card_name}</div>
                    <div className="text-xs text-muted-foreground">{s.card_code}</div>
                  </TableCell>
                  <TableCell className="text-sm">{s.contact_name || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      {s.phone && s.phone !== "NÃO ENCONTRADO" ? (
                        <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded whitespace-nowrap">
                          {formatDisplayPhone(s.phone)}
                        </span>
                      ) : (
                        <span className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded whitespace-nowrap">
                          Sem telefone
                        </span>
                      )}
                      {onRefreshContact && s.card_code && (
                        <button
                          type="button"
                          title="Recarregar telefone atualizado diretamente do SAP para este cliente"
                          onClick={() => onRefreshContact(s.card_code!)}
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
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell>
                    <ScoreBadge score={s.score} />
                  </TableCell>
                  <TableCell className="max-w-[200px] text-xs">
                    {s.comment ? (
                      <div className="text-foreground font-medium truncate" title={s.comment}>
                        "{s.comment}"
                      </div>
                    ) : s.error_message ? (
                      <div className="text-rose-500 truncate" title={s.error_message}>
                        {s.error_message}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {s.salesperson_name || "—"}
                  </TableCell>
                  {onResend && (
                    <TableCell className="text-right">
                      {s.status === "failed" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onResend(s.id)}
                          disabled={isResending}
                          className="h-7 text-xs gap-1 font-medium border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                          title="Recarrega o telefone atualizado do SAP e reenvia a mensagem WhatsApp"
                        >
                          {isResending ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Send className="size-3" />
                          )}
                          Reenviar
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
