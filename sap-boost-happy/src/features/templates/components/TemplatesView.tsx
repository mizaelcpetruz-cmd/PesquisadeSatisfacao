import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  toggleTemplateActive,
} from "../templates.functions";
import { TemplateModal } from "./TemplateModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MessageSquare, Loader2, Power } from "lucide-react";
import {
  getNormalizedCategory,
  getTemplateScoreRange,
  isTemplateActive,
  type MessageTemplateItem,
} from "../types";

export function TemplatesView() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplateItem | null>(null);

  const createTpl = useServerFn(createMessageTemplate);
  const updateTpl = useServerFn(updateMessageTemplate);
  const deleteTpl = useServerFn(deleteMessageTemplate);
  const toggleActiveTpl = useServerFn(toggleTemplateActive);

  // 1. Query templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as MessageTemplateItem[];
    },
  });

  // 2. Save mutation (Create or Update)
  const saveMutation = useMutation({
    mutationFn: async (data: {
      id?: string;
      name: string;
      body: string;
      type: string;
      minScore?: number | null;
      maxScore?: number | null;
      isDefault: boolean;
      active: boolean;
      zenviaTemplateId?: string | null;
    }) => {
      if (data.id) {
        return updateTpl({ data: { ...data, id: data.id } });
      }
      return createTpl({ data });
    },
    onSuccess: () => {
      toast.success(
        editingTemplate ? "Modelo atualizado com sucesso!" : "Modelo criado com sucesso!",
      );
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ["templates-list"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erro ao salvar modelo.";
      toast.error(msg);
    },
  });

  // 3. Toggle Active mutation
  const toggleMutation = useMutation({
    mutationFn: async (vars: { id: string; active: boolean }) => {
      return toggleActiveTpl({ data: vars });
    },
    onSuccess: (_, vars) => {
      toast.success(vars.active ? "Modelo ativado com sucesso!" : "Modelo inativado.");
      qc.invalidateQueries({ queryKey: ["templates-list"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erro ao alterar status do modelo.";
      toast.error(msg);
    },
  });

  // 4. Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteTpl({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Modelo excluído com sucesso!");
      qc.invalidateQueries({ queryKey: ["templates-list"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erro ao excluir modelo.";
      toast.error(msg);
    },
  });

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (t: MessageTemplateItem) => {
    setEditingTemplate(t);
    setModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o modelo "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (t: MessageTemplateItem) => {
    const currentActive = isTemplateActive(t);
    toggleMutation.mutate({ id: t.id, active: !currentActive });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Modelos de Mensagens</h1>
          <p className="text-sm text-muted-foreground">
            Configure os textos de envio inicial, respostas por intervalo de notas, encerramento final
            e descadastro (SAIR).
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="h-9 gap-1.5 font-medium shadow-sm">
          <Plus className="size-4" />
          Novo Modelo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando modelos de mensagens...</p>
        </div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed border-border/80">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <div className="p-3 rounded-full bg-primary/10">
              <MessageSquare className="size-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Nenhum modelo cadastrado</h3>
              <p className="text-sm text-muted-foreground">
                Crie um modelo padrão para enviar pesquisas aos seus clientes.
              </p>
            </div>
            <Button onClick={handleOpenCreate} size="sm" className="gap-1">
              <Plus className="size-4" /> Criar Primeiro Modelo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {templates.map((t) => {
            const active = isTemplateActive(t);
            const cat = getNormalizedCategory(t.type);
            const range = getTemplateScoreRange(t);

            return (
              <Card
                key={t.id}
                className={`shadow-sm border-border/60 hover:shadow-md transition-all flex flex-col justify-between ${
                  !active ? "opacity-60 bg-muted/20 border-dashed" : ""
                } ${t.is_default && active ? "border-primary/40 ring-1 ring-primary/20" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-semibold leading-tight flex items-center gap-1.5">
                        {t.name}
                      </CardTitle>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {active ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-normal">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] text-muted-foreground font-normal">
                            Inativo
                          </Badge>
                        )}

                        {t.is_default && (
                          <Badge className="bg-primary text-primary-foreground font-semibold text-[10px]">
                            Padrão
                          </Badge>
                        )}

                        <Badge variant="outline" className="text-[10px]">
                          {(() => {
                            if (cat === "inicial") return "📩 Inicial";
                            if (cat === "sair") return "🚪 Sair";
                            if (cat === "intervalo" && range) {
                              return range.min === range.max
                                ? `🎯 Intervalo: Nota ${range.min}`
                                : `🎯 Intervalo: Notas ${range.min} a ${range.max}`;
                            }
                            return "🎯 Intervalo";
                          })()}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={active ? "Inativar modelo" : "Ativar modelo"}
                        className={`size-8 ${active ? "text-emerald-600 hover:text-emerald-700" : "text-muted-foreground"}`}
                        onClick={() => handleToggleActive(t)}
                        disabled={toggleMutation.isPending}
                      >
                        <Power className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => handleOpenEdit(t)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(t.id, t.name)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="bg-muted/40 p-3 rounded-md border border-border/40 text-xs font-mono whitespace-pre-wrap text-foreground/90 leading-relaxed max-h-[140px] overflow-y-auto">
                    {t.body}
                  </div>
                  {t.zenvia_template_id && (
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <span className="font-semibold text-foreground">Zenvia Template ID:</span>
                      <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
                        {t.zenvia_template_id}
                      </code>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Template Create / Edit Modal */}
      <TemplateModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editingTemplate={editingTemplate}
        existingTemplates={templates}
        onSave={async (data) => {
          await saveMutation.mutateAsync(data);
        }}
        isSaving={saveMutation.isPending}
      />
    </div>
  );
}
