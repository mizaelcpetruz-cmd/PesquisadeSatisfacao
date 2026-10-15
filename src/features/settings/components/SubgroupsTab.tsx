import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { syncSapSubgroupsFromSap } from "../settings.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldAlert,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  FolderTree,
  Layers,
  CheckCircle2,
  Ban,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import type { AppSettingsData } from "../types";
import type { SapSubgroup, SapBpGroup } from "@/integrations/sap/sap.types";

interface SubgroupsTabProps {
  form: AppSettingsData;
  subgroups: SapSubgroup[];
  groups?: SapBpGroup[];
  onChange: (updated: Partial<AppSettingsData>) => void;
  onRefreshCatalog?: () => void;
}

export function SubgroupsTab({
  form,
  subgroups,
  groups = [],
  onChange,
  onRefreshCatalog,
}: SubgroupsTabProps) {
  const qc = useQueryClient();
  const syncFn = useServerFn(syncSapSubgroupsFromSap);

  // Selection states
  const [selectedGroupCode, setSelectedGroupCode] = useState<string>("");
  const [selectedSubgroupCode, setSelectedSubgroupCode] = useState<string>("");
  const [quickSearchQuery, setQuickSearchQuery] = useState<string>("");
  const [searchBlocked, setSearchBlocked] = useState<string>("");
  const [showCatalog, setShowCatalog] = useState<boolean>(true);

  // Merge server catalog with form
  const allSubgroups: SapSubgroup[] = useMemo(() => {
    const map = new Map<string, SapSubgroup>();
    for (const sg of subgroups) {
      if (sg && sg.Code) map.set(sg.Code, sg);
    }
    for (const sg of form.custom_subgroups || []) {
      if (sg && sg.Code) map.set(sg.Code, sg as SapSubgroup);
    }
    return Array.from(map.values());
  }, [subgroups, form.custom_subgroups]);

  // Derive all unique groups with subgroup counts
  const availableGroups = useMemo(() => {
    const groupMap = new Map<string, { groupCode: string; groupName: string; count: number }>();

    // Seed from groups prop
    for (const g of groups) {
      groupMap.set(g.groupCode, {
        groupCode: g.groupCode,
        groupName: g.groupName,
        count: 0,
      });
    }

    // Accumulate from allSubgroups
    for (const sg of allSubgroups) {
      if (!sg.groupCode) continue;
      const existing = groupMap.get(sg.groupCode);
      const gName = sg.groupName || sg.Group || `Grupo ${sg.groupCode}`;
      if (existing) {
        existing.count += 1;
      } else {
        groupMap.set(sg.groupCode, {
          groupCode: sg.groupCode,
          groupName: gName,
          count: 1,
        });
      }
    }

    return Array.from(groupMap.values()).sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [groups, allSubgroups]);

  // Subgroups strictly related to the selected group
  const subgroupsForSelectedGroup = useMemo(() => {
    if (!selectedGroupCode) return [];
    return allSubgroups
      .filter((sg) => String(sg.groupCode) === String(selectedGroupCode))
      .sort((a, b) => (a.Name || "").localeCompare(b.Name || ""));
  }, [selectedGroupCode, allSubgroups]);

  // Quick search across ALL subgroups in the catalog (e.g. user typing "barano")
  const quickSearchResults = useMemo(() => {
    if (!quickSearchQuery || quickSearchQuery.trim().length < 2) return [];
    const q = quickSearchQuery.toLowerCase().trim();
    return allSubgroups
      .filter(
        (sg) =>
          sg.Name?.toLowerCase().includes(q) ||
          sg.subgroup?.toLowerCase().includes(q) ||
          sg.groupName?.toLowerCase().includes(q) ||
          sg.Group?.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [quickSearchQuery, allSubgroups]);

  // Group catalog by group for full catalog viewer
  const catalogGrouped = useMemo(() => {
    const map = new Map<string, { groupCode: string; groupName: string; items: SapSubgroup[] }>();
    for (const sg of allSubgroups) {
      const gCode = sg.groupCode || "outros";
      const gName = sg.groupName || sg.Group || `Grupo ${gCode}`;
      if (!map.has(gCode)) {
        map.set(gCode, { groupCode: gCode, groupName: gName, items: [] });
      }
      map.get(gCode)!.items.push(sg);
    }
    return Array.from(map.values()).sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [allSubgroups]);

  // Sync Mutation directly from SAP Service Layer (@CSG_LINHA)
  const syncMutation = useMutation({
    mutationFn: async () => {
      return await syncFn();
    },
    onSuccess: (data) => {
      toast.success(
        `Catálogo SAP sincronizado: ${data.groupsCount} grupos e ${data.subgroupsCount} subgrupos da @CSG_LINHA atualizados!`,
      );
      onChange({ custom_subgroups: data.subgroups });
      qc.setQueryData(["sap-groups-catalog"], { groups: data.groups, subgroups: data.subgroups });
      qc.invalidateQueries({ queryKey: ["sap-groups-catalog"] });
      qc.invalidateQueries({ queryKey: ["app-settings"] });
      if (onRefreshCatalog) onRefreshCatalog();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Falha ao sincronizar catálogo do SAP";
      toast.error(msg);
    },
  });

  // Action: Add single subgroup to blocked list
  const handleAddBlockedCode = (code: string) => {
    if (!code) return;
    if (form.blocked_subgroups.includes(code)) {
      toast.info("Este subgrupo já está bloqueado.");
      return;
    }

    onChange({
      blocked_subgroups: [...form.blocked_subgroups, code],
    });
    setSelectedSubgroupCode("");
    toast.success("Subgrupo adicionado à lista de bloqueio.");
  };

  const handleAddBlocked = () => {
    handleAddBlockedCode(selectedSubgroupCode);
  };

  // Action: Block all subgroups of the selected group
  const handleBlockAllFromGroup = () => {
    if (!selectedGroupCode || subgroupsForSelectedGroup.length === 0) return;
    const codesToBlock = subgroupsForSelectedGroup.map((sg) => sg.Code);
    const newBlocked = Array.from(new Set([...form.blocked_subgroups, ...codesToBlock]));
    const newlyAddedCount = newBlocked.length - form.blocked_subgroups.length;

    onChange({ blocked_subgroups: newBlocked });
    toast.success(`${newlyAddedCount} subgrupos do grupo foram adicionados ao bloqueio!`);
  };

  // Action: Remove single blocked item
  const handleRemoveBlocked = (codeToRemove: string) => {
    onChange({
      blocked_subgroups: form.blocked_subgroups.filter((c) => c !== codeToRemove),
    });
  };

  // Action: Unblock all subgroups for a specific group
  const handleUnblockGroup = (groupCode: string) => {
    onChange({
      blocked_subgroups: form.blocked_subgroups.filter((code) => {
        const parts = code.split(":");
        return parts[0] !== groupCode;
      }),
    });
    toast.info("Subgrupos deste grupo foram desbloqueados.");
  };

  // Group blocked items by their group for clean, organized display
  const blockedByGroup = useMemo(() => {
    const map = new Map<
      string,
      {
        groupCode: string;
        groupName: string;
        items: Array<{ code: string; name: string }>;
      }
    >();

    for (const code of form.blocked_subgroups) {
      const matched = allSubgroups.find((s) => s.Code === code);
      const [gCodeFromSplit, subNameFromSplit] = code.split(":");
      const gCode = matched?.groupCode || gCodeFromSplit || "Outros";
      const gName = matched?.groupName || matched?.Group || `Grupo ${gCode}`;
      const subName = matched?.Name || matched?.subgroup || subNameFromSplit || "(Sem Subgrupo)";

      // Apply search filter if user is searching
      if (searchBlocked) {
        const q = searchBlocked.toLowerCase();
        const matchG = gName.toLowerCase().includes(q) || gCode.toLowerCase().includes(q);
        const matchS = subName.toLowerCase().includes(q) || code.toLowerCase().includes(q);
        if (!matchG && !matchS) continue;
      }

      if (!map.has(gCode)) {
        map.set(gCode, { groupCode: gCode, groupName: gName, items: [] });
      }
      map.get(gCode)!.items.push({ code, name: subName });
    }

    return Array.from(map.values()).sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [form.blocked_subgroups, allSubgroups, searchBlocked]);

  return (
    <div className="space-y-6">
      {/* Top Banner & SAP Sync Action */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FolderTree className="size-5 text-primary" />
                <CardTitle className="text-lg font-semibold">
                  Grupos e Subgrupos de Clientes (SAP @CSG_LINHA)
                </CardTitle>
              </div>
              <CardDescription>
                Selecione os grupos e subgrupos de clientes que devem ser ignorados nas pesquisas de satisfação.
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="h-9 gap-2 shrink-0 border-primary/30 hover:border-primary/50 text-foreground"
            >
              <RefreshCw
                className={`size-4 text-primary ${syncMutation.isPending ? "animate-spin" : ""}`}
              />
              {syncMutation.isPending ? "Consultando SAP..." : "Atualizar Dados do SAP"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="font-normal gap-1">
              <Layers className="size-3 text-primary" />
              {availableGroups.length} Grupos no SAP
            </Badge>
            <Badge variant="secondary" className="font-normal gap-1">
              <CheckCircle2 className="size-3 text-emerald-500" />
              {allSubgroups.length} Subgrupos da @CSG_LINHA
            </Badge>
            <Badge
              variant="outline"
              className={`font-normal gap-1 ${
                form.blocked_subgroups.length > 0
                  ? "border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/5"
                  : ""
              }`}
            >
              <Ban className="size-3" />
              {form.blocked_subgroups.length} Subgrupos Bloqueados
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-0">
          {/* Quick Search for any subgroup directly (e.g. BARANO) */}
          <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="quick-subgroup-search" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" />
                Busca Rápida de Subgrupo (por nome direto, ex: Barano)
              </Label>
              {quickSearchQuery && (
                <button
                  type="button"
                  onClick={() => setQuickSearchQuery("")}
                  className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Limpar busca
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="quick-subgroup-search"
                placeholder="Digite o nome de qualquer subgrupo (ex: BARANO, RESTAURANTES, ATACADISTA...)"
                value={quickSearchQuery}
                onChange={(e) => setQuickSearchQuery(e.target.value)}
                className="h-9 pl-9 bg-background text-sm"
              />
            </div>

            {/* Quick search instant results */}
            {quickSearchResults.length > 0 && (
              <div className="pt-1.5 space-y-1.5">
                <div className="text-[11px] font-medium text-muted-foreground">
                  Subgrupos encontrados no SAP ({quickSearchResults.length}):
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {quickSearchResults.map((sg) => {
                    const isBlocked = form.blocked_subgroups.includes(sg.Code);
                    return (
                      <div
                        key={sg.Code}
                        className="flex items-center justify-between p-2 rounded-lg border border-border bg-background shadow-xs text-xs"
                      >
                        <div className="truncate pr-2">
                          <span className="font-semibold text-foreground">{sg.Name}</span>
                          <span className="text-[11px] text-muted-foreground block truncate">
                            Grupo: {sg.groupName} ({sg.groupCode})
                          </span>
                        </div>
                        {isBlocked ? (
                          <Badge variant="outline" className="text-[10px] text-rose-500 border-rose-500/30 shrink-0">
                            Já bloqueado
                          </Badge>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAddBlockedCode(sg.Code)}
                            className="h-7 text-xs gap-1 shrink-0"
                          >
                            <Plus className="size-3" /> Bloquear
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {quickSearchQuery.trim().length >= 2 && quickSearchResults.length === 0 && (
              <p className="text-xs text-muted-foreground pt-1">
                Nenhum subgrupo encontrado com o termo &quot;{quickSearchQuery}&quot;. Tente atualizar os dados do SAP acima.
              </p>
            )}
          </div>

          {/* 2-Step Hierarchical Selector (Grupo -> Subgrupo) */}
          <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-4">
            <div className="font-medium text-sm text-foreground flex items-center gap-2">
              <ShieldAlert className="size-4 text-rose-500" />
              Bloquear por Grupo e Subgrupo Relacionado
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 items-end">
              {/* Step 1: Grupo */}
              <div className="space-y-1.5 lg:col-span-5">
                <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>1. Selecionar Grupo de Clientes</span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    {availableGroups.length} disponíveis
                  </span>
                </Label>
                <Select
                  value={selectedGroupCode}
                  onValueChange={(val) => {
                    setSelectedGroupCode(val);
                    setSelectedSubgroupCode("");
                  }}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="Selecione um grupo do SAP..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {availableGroups.map((g) => (
                      <SelectItem key={g.groupCode} value={g.groupCode}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="font-medium truncate">{g.groupName}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                            ({g.count} subgrupos)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: Subgrupo Relacionado */}
              <div className="space-y-1.5 lg:col-span-5">
                <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>2. Subgrupo Relacionado</span>
                  {selectedGroupCode && (
                    <span className="text-[11px] text-muted-foreground font-normal">
                      {subgroupsForSelectedGroup.length} encontrados
                    </span>
                  )}
                </Label>
                <Select
                  value={selectedSubgroupCode}
                  onValueChange={setSelectedSubgroupCode}
                  disabled={!selectedGroupCode}
                >
                  <SelectTrigger className="h-9 bg-background disabled:opacity-50">
                    <SelectValue
                      placeholder={
                        selectedGroupCode
                          ? "Selecione o subgrupo para bloquear..."
                          : "Escolha primeiro um grupo acima"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {subgroupsForSelectedGroup.length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        Nenhum subgrupo cadastrado neste grupo.
                      </div>
                    ) : (
                      subgroupsForSelectedGroup.map((sg) => {
                        const isAlreadyBlocked = form.blocked_subgroups.includes(sg.Code);
                        return (
                          <SelectItem
                            key={sg.Code}
                            value={sg.Code}
                            disabled={isAlreadyBlocked}
                          >
                            <span className={isAlreadyBlocked ? "line-through opacity-50" : ""}>
                              {sg.Name || "(Sem Subgrupo)"}
                            </span>
                            {isAlreadyBlocked && (
                              <span className="ml-2 text-[10px] text-rose-500 font-normal">
                                (já bloqueado)
                              </span>
                            )}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 lg:col-span-2">
                <Button
                  type="button"
                  onClick={handleAddBlocked}
                  disabled={!selectedSubgroupCode}
                  className="h-9 w-full gap-1 font-medium text-xs shadow-sm"
                >
                  <Plus className="size-3.5" /> Bloquear
                </Button>
              </div>
            </div>

            {/* Quick Action: Block entire group */}
            {selectedGroupCode && subgroupsForSelectedGroup.length > 1 && (
              <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground border-t border-border/50">
                <span>
                  Deseja bloquear todos os {subgroupsForSelectedGroup.length} subgrupos deste grupo de uma vez?
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBlockAllFromGroup}
                  className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                >
                  Bloquear Todos do Grupo
                </Button>
              </div>
            )}
          </div>

          {/* Blocked Subgroups Section (Organized by Group) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Subgrupos Atualmente Bloqueados ({form.blocked_subgroups.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Clientes destes subgrupos não receberão pesquisas de satisfação.
                </p>
              </div>

              {form.blocked_subgroups.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar por grupo ou subgrupo bloqueado..."
                    value={searchBlocked}
                    onChange={(e) => setSearchBlocked(e.target.value)}
                    className="h-8 pl-8 text-xs bg-background"
                  />
                </div>
              )}
            </div>

            {form.blocked_subgroups.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-border/80 bg-muted/10 space-y-2">
                <CheckCircle2 className="size-8 mx-auto text-emerald-500/80" />
                <div className="text-sm font-medium text-foreground">Nenhum subgrupo bloqueado</div>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Todos os clientes faturados no SAP que possuírem WhatsApp válido estarão elegíveis para
                  receber pesquisas de satisfação.
                </p>
              </div>
            ) : blockedByGroup.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                Nenhum resultado encontrado para &quot;{searchBlocked}&quot;.
              </div>
            ) : (
              <div className="space-y-3">
                {blockedByGroup.map((group) => (
                  <div
                    key={group.groupCode}
                    className="rounded-lg border border-border/80 bg-card p-3.5 space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground">
                          {group.groupName}
                        </span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono">
                          Código {group.groupCode}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          ({group.items.length} bloqueado{group.items.length > 1 ? "s" : ""})
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnblockGroup(group.groupCode)}
                        className="h-6 text-[11px] text-muted-foreground hover:text-rose-600 px-2"
                        title="Desbloquear todos os subgrupos deste grupo"
                      >
                        Desbloquear Grupo
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((item) => (
                        <span
                          key={item.code}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border border-rose-500/25 bg-rose-500/5 text-rose-800 dark:text-rose-300 transition-colors"
                        >
                          <span className="font-medium">{item.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBlocked(item.code)}
                            className="p-0.5 rounded hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer"
                            title="Remover bloqueio deste subgrupo"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Full SAP Subgroups Catalog Explorer */}
          <div className="border-t border-border/60 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Layers className="size-3.5 text-primary" />
                  Catálogo Completo de Subgrupos SAP (@CSG_LINHA)
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Visualize todos os subgrupos ativos cadastrados no SAP por grupo.
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCatalog(!showCatalog)}
                className="h-7 text-xs gap-1 text-muted-foreground"
              >
                {showCatalog ? (
                  <>
                    <ChevronUp className="size-3.5" /> Ocultar Catálogo
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3.5" /> Ver Catálogo ({allSubgroups.length})
                  </>
                )}
              </Button>
            </div>

            {showCatalog && (
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 pt-1">
                {catalogGrouped.map((g) => (
                  <div
                    key={g.groupCode}
                    className="p-3 rounded-lg border border-border/70 bg-background/50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-semibold text-foreground">
                      <span className="truncate">{g.groupName}</span>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        ({g.items.length})
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {g.items.map((sub) => {
                        const isBlocked = form.blocked_subgroups.includes(sub.Code);
                        return (
                          <button
                            key={sub.Code}
                            type="button"
                            onClick={() => {
                              if (isBlocked) {
                                handleRemoveBlocked(sub.Code);
                              } else {
                                handleAddBlockedCode(sub.Code);
                              }
                            }}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer border ${
                              isBlocked
                                ? "bg-rose-500/10 text-rose-600 border-rose-500/30 line-through"
                                : "bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 border-transparent"
                            }`}
                            title={isBlocked ? "Clique para desbloquear" : "Clique para bloquear"}
                          >
                            {sub.Name || "(Sem Subgrupo)"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
