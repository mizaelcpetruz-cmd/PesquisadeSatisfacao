import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
import type { AppSettingsData } from "../types";

interface GeneralSettingsTabProps {
  form: AppSettingsData;
  onChange: (updated: Partial<AppSettingsData>) => void;
}

export function GeneralSettingsTab({ form, onChange }: GeneralSettingsTabProps) {
  return (
    <div className="space-y-6">
      {/* Regras de Reenvio & Contingência */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-amber-500" />
            <CardTitle className="text-base font-semibold">
              Regras de Reenvio & Contingência (WhatsApp)
            </CardTitle>
          </div>
          <CardDescription>
            Configure intervalos de reenvio para pesquisas com erro temporário de entrega e limites de tentativas.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="retry-interval">Intervalo de Reenvio (Horas)</Label>
            <Input
              id="retry-interval"
              type="number"
              min={1}
              max={168}
              value={form.retry_interval_hours}
              onChange={(e) =>
                onChange({ retry_interval_hours: parseInt(e.target.value, 10) || 24 })
              }
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Tempo mínimo de espera antes de tentar reenviar uma pesquisa com erro.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-attempts">Máximo de Tentativas</Label>
            <Input
              id="max-attempts"
              type="number"
              min={1}
              max={10}
              value={form.max_retry_attempts}
              onChange={(e) => onChange({ max_retry_attempts: parseInt(e.target.value, 10) || 3 })}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Limite máximo de tentativas antes de marcar o envio como falha definitiva.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
