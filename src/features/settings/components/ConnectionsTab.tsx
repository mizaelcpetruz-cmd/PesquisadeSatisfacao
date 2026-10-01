import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { testInfrastructureConnections } from "../settings.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plug, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ConnectionsTab() {
  const testFn = useServerFn(testInfrastructureConnections);
  const [results, setResults] = useState<{
    sap?: { ok: boolean; message: string };
    zenvia?: { ok: boolean; message: string };
    smtp?: { ok: boolean; message: string };
  } | null>(null);

  const testMutation = useMutation({
    mutationFn: async () => {
      return await testFn();
    },
    onSuccess: (res) => {
      setResults(res);
      const allOk = res.sap.ok && res.zenvia.ok && res.smtp.ok;
      if (allOk) {
        toast.success("Todas as conexões externas estão operacionais!");
      } else {
        toast.warning("Uma ou mais conexões falharam. Verifique os logs abaixo.");
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erro ao testar conexões.";
      toast.error(msg);
    },
  });

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Diagnóstico de Infraestrutura
              </CardTitle>
              <CardDescription>
                Execute testes síncronos com SAP Business One, Zenvia WhatsApp e Servidor de E-mail
                SMTP.
              </CardDescription>
            </div>
            <Button
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              className="gap-1.5 h-9"
            >
              {testMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Testando Conexões...
                </>
              ) : (
                <>
                  <Plug className="size-4" />
                  Testar Todas as Conexões
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="grid gap-4 md:grid-cols-3">
            {/* SAP Service Layer */}
            <div className="p-4 rounded-lg border border-border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">SAP Service Layer</span>
                {results?.sap ? (
                  results.sap.ok ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1 text-xs">
                      <CheckCircle2 className="size-3" /> Conectado
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 gap-1 text-xs">
                      <XCircle className="size-3" /> Falhou
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Não testado
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {results?.sap?.message ||
                  "Testa autenticação, pool de sessão e consulta de faturas."}
              </p>
            </div>

            {/* Zenvia WhatsApp */}
            <div className="p-4 rounded-lg border border-border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Zenvia WhatsApp API</span>
                {results?.zenvia ? (
                  results.zenvia.ok ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1 text-xs">
                      <CheckCircle2 className="size-3" /> Conectado
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 gap-1 text-xs">
                      <XCircle className="size-3" /> Falhou
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Não testado
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {results?.zenvia?.message ||
                  "Valida chave X-API-TOKEN e comunicação com canais WhatsApp."}
              </p>
            </div>

            {/* SMTP Email */}
            <div className="p-4 rounded-lg border border-border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Servidor SMTP E-mail</span>
                {results?.smtp ? (
                  results.smtp.ok ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1 text-xs">
                      <CheckCircle2 className="size-3" /> Conectado
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 gap-1 text-xs">
                      <XCircle className="size-3" /> Falhou
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Não testado
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {results?.smtp?.message ||
                  "Verifica handshake e autenticação SSL/TLS do Nodemailer pool."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
