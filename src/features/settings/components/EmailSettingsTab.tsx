import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail } from "lucide-react";
import type { AppSettingsData } from "../types";

interface EmailSettingsTabProps {
  form: AppSettingsData;
  onChange: (updated: Partial<AppSettingsData>) => void;
}

export function EmailSettingsTab({ form, onChange }: EmailSettingsTabProps) {
  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Mail className="size-5 text-primary" />
            <CardTitle className="text-base font-semibold">
              Modelo de E-mail de Contingência
            </CardTitle>
          </div>
          <CardDescription>
            Configure o assunto e o corpo HTML do e-mail disparado para clientes sem WhatsApp ou
            como contingência.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-subject">Assunto do E-mail</Label>
            <Input
              id="email-subject"
              value={form.email_template_subject}
              onChange={(e) => onChange({ email_template_subject: e.target.value })}
              placeholder="Ex: Pesquisa de Satisfação Petruz"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-body">Corpo HTML do E-mail</Label>
            <Textarea
              id="email-body"
              rows={8}
              value={form.email_template_body}
              onChange={(e) => onChange({ email_template_body: e.target.value })}
              placeholder="Deixe em branco para utilizar o layout padrão com botões interativos de 0 a 10."
              className="font-mono text-xs leading-relaxed"
            />
            <div className="text-[11px] text-muted-foreground bg-muted/40 p-3 rounded-md border border-border/40 space-y-1">
              <p className="font-semibold text-foreground">Tags especiais suportadas:</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <code className="bg-background px-1.5 py-0.5 rounded border">
                  {"{{nome_cliente}}"}
                </code>
                <code className="bg-background px-1.5 py-0.5 rounded border">
                  {"{{id_pedido}}"}
                </code>
                <code className="bg-background px-1.5 py-0.5 rounded border">
                  {"{{link_nota_0}} ... {{link_nota_10}}"}
                </code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
