import { useState } from "react";
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
import { ShieldAlert, Plus, Trash2, Search } from "lucide-react";
import type { AppSettingsData } from "../types";
import type { SapSubgroup } from "@/integrations/sap/sap.types";

interface SubgroupsTabProps {
  form: AppSettingsData;
  subgroups: SapSubgroup[];
  onChange: (updated: Partial<AppSettingsData>) => void;
}

export function SubgroupsTab({ form, subgroups, onChange }: SubgroupsTabProps) {
  const [selectedSubgroupToAdd, setSelectedSubgroupToAdd] = useState("");
  const [searchCatalog, setSearchCatalog] = useState("");

  const allSubgroups = [...subgroups, ...(form.custom_subgroups || [])];

  const handleAddBlocked = () => {
    if (!selectedSubgroupToAdd) return;
    if (form.blocked_subgroups.includes(selectedSubgroupToAdd)) return;

    onChange({
      blocked_subgroups: [...form.blocked_subgroups, selectedSubgroupToAdd],
    });
    setSelectedSubgroupToAdd("");
  };

  const handleRemoveBlocked = (codeToRemove: string) => {
    onChange({
      blocked_subgroups: form.blocked_subgroups.filter((c) => c !== codeToRemove),
    });
  };

  const filteredCatalog = allSubgroups.filter((sg) => {
    if (!searchCatalog) return true;
    const q = searchCatalog.toLowerCase();
    return (
      sg.Name?.toLowerCase().includes(q) ||
      sg.Group?.toLowerCase().includes(q) ||
      sg.groupName?.toLowerCase().includes(q) ||
      sg.Code?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-rose-500" />
            <CardTitle className="text-base font-semibold">
              Subgrupos SAP Bloqueados (Lista Negra)
            </CardTitle>
          </div>
          <CardDescription>
            Clientes pertencentes aos subgrupos bloqueados abaixo serão ignorados nas rotinas
            automáticas de pesquisa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Subgroup Bar */}
          <div className="flex flex-col sm:flex-row items-end gap-3 p-3 bg-muted/40 rounded-lg border border-border/50">
            <div className="space-y-1 flex-1 min-w-[240px]">
              <Label className="text-xs text-muted-foreground">
                Selecionar Subgrupo do Catálogo SAP
              </Label>
              <Select value={selectedSubgroupToAdd} onValueChange={setSelectedSubgroupToAdd}>
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="Selecione um subgrupo para bloquear..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {allSubgroups
                    .filter((sg) => !form.blocked_subgroups.includes(sg.Code))
                    .map((sg, idx) => (
                      <SelectItem key={`${sg.Code}-${idx}`} value={sg.Code}>
                        <span className="font-medium">{sg.Name || "(Sem Subgrupo)"}</span>{" "}
                        <span className="text-xs text-muted-foreground">
                          ({sg.Group || sg.groupName})
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={handleAddBlocked}
              disabled={!selectedSubgroupToAdd}
              className="h-9 gap-1"
            >
              <Plus className="size-4" /> Bloquear Subgrupo
            </Button>
          </div>

          {/* Blocked List */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Subgrupos Atualmente Bloqueados ({form.blocked_subgroups.length})
            </Label>
            {form.blocked_subgroups.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                Nenhum subgrupo bloqueado. Todos os clientes faturados poderão receber pesquisas.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {form.blocked_subgroups.map((code) => {
                  const matched = allSubgroups.find((s) => s.Code === code);
                  return (
                    <div
                      key={code}
                      className="flex items-center justify-between p-2.5 rounded-md border border-rose-500/20 bg-rose-500/5 text-xs"
                    >
                      <div className="truncate pr-2">
                        <div className="font-semibold text-rose-700 dark:text-rose-400 truncate">
                          {matched?.Name || code}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {matched?.Group || matched?.groupName || "Grupo SAP"}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 shrink-0"
                        onClick={() => handleRemoveBlocked(code)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
