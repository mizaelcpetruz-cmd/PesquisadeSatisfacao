import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Loader2, Hash, AlertTriangle, Power } from "lucide-react";
import { listZenviaTemplates } from "../templates.functions";
import {
  getNormalizedCategory,
  getTemplateScoreRange,
  isTemplateActive,
  findScoreOverlap,
  type MessageTemplateItem,
  type TemplateCategory,
} from "../types";

const DEFAULT_INICIAL_BODY = `Olá {{nome}}! Sou da Petruz. Recebemos sua compra (NF {{numero_nf}}) e gostaríamos de saber: de 0 a 10, qual a chance de você nos indicar a um amigo?
Responda apenas com o número de 0 a 10. Obrigado! 🙏
(Caso não queira mais receber nossas pesquisas, responda SAIR a qualquer momento).`;

const DEFAULT_INTERVALO_BODY = `Agradecemos muito pela sua resposta e avaliação! Trabalhamos constantemente para oferecer a melhor experiência. 👍`;

const DEFAULT_SAIR_BODY = `Você foi descadastrado com sucesso das nossas pesquisas de satisfação. Agradecemos sua atenção e parceria! 🙏 Caso deseje reativar no futuro, entre em contato conosco.`;

interface TemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTemplate: MessageTemplateItem | null;
  existingTemplates?: MessageTemplateItem[];
  onSave: (data: {
    id?: string;
    name: string;
    body: string;
    type: string;
    minScore?: number | null;
    maxScore?: number | null;
    isDefault: boolean;
    active: boolean;
    zenviaTemplateId?: string | null;
  }) => Promise<void>;
  isSaving: boolean;
}

export function TemplateModal({
  open,
  onOpenChange,
  editingTemplate,
  existingTemplates = [],
  onSave,
  isSaving,
}: TemplateModalProps) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("inicial");
  const [minScore, setMinScore] = useState<number>(1);
  const [maxScore, setMaxScore] = useState<number>(3);
  const [isDefault, setIsDefault] = useState(false);
  const [active, setActive] = useState(true);
  const [zenviaTemplateId, setZenviaTemplateId] = useState("");

  const listZenviaFn = useServerFn(listZenviaTemplates);
  const { data: zenviaTemplates = [], isLoading: isLoadingZenvia } = useQuery({
    queryKey: ["zenvia-templates-approved"],
    queryFn: () => listZenviaFn(),
    enabled: open,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (editingTemplate) {
      setName(editingTemplate.name);
      setBody(editingTemplate.body);
      const cat = getNormalizedCategory(editingTemplate.type, editingTemplate.name);
      setCategory(cat);

      const range = getTemplateScoreRange(editingTemplate);
      if (range) {
        setMinScore(range.min);
        setMaxScore(range.max);
      }

      setIsDefault(editingTemplate.is_default);
      setActive(isTemplateActive(editingTemplate));
      setZenviaTemplateId(editingTemplate.zenvia_template_id || "");
    } else {
      setName("");
      setBody(DEFAULT_INICIAL_BODY);
      setCategory("inicial");
      setMinScore(1);
      setMaxScore(3);
      setIsDefault(false);
      setActive(true);
      setZenviaTemplateId("");
    }
  }, [editingTemplate, open]);

  // Checagem informativa em tempo real de sobreposição de intervalo de notas
  const overlapCheck = useMemo(() => {
    if (category !== "intervalo" || !active) return { conflict: false };
    return findScoreOverlap(minScore, maxScore, existingTemplates, editingTemplate?.id);
  }, [category, active, minScore, maxScore, existingTemplates, editingTemplate?.id]);

  const handleCategoryChange = (newCat: TemplateCategory) => {
    setCategory(newCat);
    if (!editingTemplate) {
      if (newCat === "inicial") {
        setBody(DEFAULT_INICIAL_BODY);
        if (!name || name.startsWith("Resposta")) setName("Pesquisa NPS Inicial");
      } else if (newCat === "intervalo") {
        setBody(DEFAULT_INTERVALO_BODY);
        setName(`Resposta para Notas de ${minScore} a ${maxScore}`);
      } else if (newCat === "sair") {
        setBody(DEFAULT_SAIR_BODY);
        setName("Mensagem de Descadastro (SAIR)");
      }
    }
  };

  const handleSelectZenviaTemplate = (tplId: string) => {
    setZenviaTemplateId(tplId);
    const found = zenviaTemplates.find((t) => t.id === tplId);
    if (found?.text) {
      setBody(found.text);
      if (!name) setName(found.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalName = name.trim();
    if (category === "intervalo" && minScore != null && maxScore != null) {
      const hasRange = finalName.match(/(?:\[\s*\d+\s*[-aà]\s*\d+\s*\]|\b\d+\s*(?:a|-|à|ate|até)\s*\d+\b)/i);
      if (!hasRange) {
        finalName = `[${minScore}-${maxScore}] ${finalName}`;
      }
    }

    await onSave({
      id: editingTemplate?.id,
      name: finalName,
      body,
      type: category,
      minScore: category === "intervalo" ? Number(minScore) : null,
      maxScore: category === "intervalo" ? Number(maxScore) : null,
      isDefault,
      active,
      zenviaTemplateId: category === "inicial" ? zenviaTemplateId.trim() || null : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b border-border/50 shrink-0">
            <DialogTitle className="text-lg font-semibold">
              {editingTemplate ? "Editar Modelo de Mensagem" : "Novo Modelo de Mensagem"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="tpl-name">Nome do Modelo</Label>
              <Input
                id="tpl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pesquisa Inicial ou Resposta Notas 1 a 3"
                required
              />
            </div>

            {/* 3 Tipos: Inicial, Intervalo, Sair */}
            <div className="space-y-1">
              <Label>Finalidade do Modelo</Label>
              <Select
                value={category}
                onValueChange={(val) => handleCategoryChange(val as TemplateCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inicial">
                    📩 Inicial (Pergunta de Pesquisa)
                  </SelectItem>
                  <SelectItem value="intervalo">
                    🎯 Intervalo (Resposta por Faixa de Notas)
                  </SelectItem>
                  <SelectItem value="sair">
                    🚪 Sair (Mensagem de Descadastro / Opt-Out)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Configuração e Validação de Intervalo de Notas */}
            {category === "intervalo" && (
              <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Hash className="size-4" /> Intervalo de Notas Abrangido
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label htmlFor="min-score" className="text-xs">
                      Nota Mínima
                    </Label>
                    <Input
                      id="min-score"
                      type="number"
                      min={0}
                      max={10}
                      value={minScore}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMinScore(val);
                        if (!editingTemplate && (!name || name.startsWith("Resposta para Notas"))) {
                          setName(`Resposta para Notas de ${val} a ${maxScore}`);
                        }
                      }}
                      className="h-9 bg-background"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="max-score" className="text-xs">
                      Nota Máxima
                    </Label>
                    <Input
                      id="max-score"
                      type="number"
                      min={0}
                      max={10}
                      value={maxScore}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMaxScore(val);
                        if (!editingTemplate && (!name || name.startsWith("Resposta para Notas"))) {
                          setName(`Resposta para Notas de ${minScore} a ${val}`);
                        }
                      }}
                      className="h-9 bg-background"
                      required
                    />
                  </div>
                </div>

                {overlapCheck.conflict && overlapCheck.conflictingTemplate ? (
                  <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs p-2.5 rounded-md mt-2">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Aviso de faixa compartilhada</span>
                      <p className="mt-0.5 text-[11px] leading-tight">
                        As notas de <strong>{minScore}</strong> a <strong>{maxScore}</strong> coincidem com{" "}
                        <strong>&quot;{overlapCheck.conflictingTemplate.name}&quot;</strong>.
                        O sistema dará prioridade ao modelo padrão ou com intervalo mais específico.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground pt-0.5">
                    Quando o cliente responder qualquer nota entre{" "}
                    <strong className="text-foreground">{minScore}</strong> e{" "}
                    <strong className="text-foreground">{maxScore}</strong>, o sistema enviará esta
                    mensagem.
                  </p>
                )}
              </div>
            )}

            {category === "inicial" && (
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="zenvia-id" className="text-xs font-semibold">
                      Vincular com Template Zenvia WhatsApp (Aprovado na Meta)
                    </Label>
                    {isLoadingZenvia && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Loader2 className="size-3 animate-spin" /> Carregando Zenvia...
                      </span>
                    )}
                  </div>

                  {zenviaTemplates.length > 0 ? (
                    <Select
                      value={zenviaTemplateId}
                      onValueChange={handleSelectZenviaTemplate}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecione o template aprovado na Zenvia" />
                      </SelectTrigger>
                      <SelectContent>
                        {zenviaTemplates.map((zt) => (
                          <SelectItem key={zt.id} value={zt.id} className="text-xs">
                            <span className="font-medium">{zt.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-2">
                              ({zt.id.slice(0, 8)}...)
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="zenvia-id"
                      value={zenviaTemplateId}
                      onChange={(e) => setZenviaTemplateId(e.target.value)}
                      placeholder="Ex: d1f7eca1-7241-4f53-a2bd-b51a17c166ff"
                      className="h-9 text-xs font-mono"
                    />
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Ao selecionar o template, a mensagem é enviada pelo canal oficial aprovado da Meta.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="tpl-body">Texto da Mensagem</Label>
              <Textarea
                id="tpl-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                required
                className="font-mono text-xs leading-relaxed"
              />
              <div className="text-[11px] text-muted-foreground space-y-1 bg-muted/40 p-2.5 rounded border border-border/50">
                <p className="font-semibold text-foreground">
                  Variáveis disponíveis para interpolação:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <code className="bg-background px-1.5 py-0.5 rounded border">{"{{nome}}"}</code>
                  <code className="bg-background px-1.5 py-0.5 rounded border">
                    {"{{cliente}}"}
                  </code>
                  <code className="bg-background px-1.5 py-0.5 rounded border">
                    {"{{numero_nf}}"}
                  </code>
                  <code className="bg-background px-1.5 py-0.5 rounded border">{"{{data}}"}</code>
                </div>
              </div>
            </div>

            {/* Opções de Ativo e Padrão */}
            <div className="space-y-2 pt-1 border-t border-border/50">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tpl-active"
                  checked={active}
                  onCheckedChange={(checked) => setActive(!!checked)}
                />
                <Label htmlFor="tpl-active" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                  <Power className={`size-3.5 ${active ? "text-emerald-500" : "text-muted-foreground"}`} />
                  Modelo Ativo para Envio / Resposta
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tpl-default"
                  checked={isDefault}
                  onCheckedChange={(checked) => setIsDefault(!!checked)}
                />
                <Label htmlFor="tpl-default" className="text-sm font-normal cursor-pointer">
                  Definir como modelo padrão do sistema para este tipo
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 pt-3 border-t border-border/50 bg-muted/20 shrink-0 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingTemplate ? "Salvar Alterações" : "Criar Modelo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
