import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getAppSettings,
  saveAppSettings,
  getSapGroupsAndSubgroupsCatalog,
} from "../settings.functions";
import { GeneralSettingsTab } from "./GeneralSettingsTab";
import { SubgroupsTab } from "./SubgroupsTab";
import { SystemLogsTab } from "./SystemLogsTab";
import { ConnectionsTab } from "./ConnectionsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import type { AppSettingsData } from "../types";

export function SettingsView() {
  const qc = useQueryClient();
  const getSettingsFn = useServerFn(getAppSettings);
  const saveSettingsFn = useServerFn(saveAppSettings);
  const getCatalogFn = useServerFn(getSapGroupsAndSubgroupsCatalog);

  const [form, setForm] = useState<AppSettingsData>({
    thank_you_promoter: "",
    thank_you_detractor: "",
    retry_interval_hours: 24,
    max_retry_attempts: 3,
    blocked_subgroups: [],
    custom_subgroups: [],
    email_template_subject: "Pesquisa de Satisfação Petruz",
    email_template_body: "",
    current_environment: "test",
  });

  // 1. Query App Settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: () => getSettingsFn(),
  });

  // 2. Query SAP Groups & Subgroups Catalog
  const { data: catalog = { groups: [], subgroups: [] }, refetch: refetchCatalog } = useQuery({
    queryKey: ["sap-groups-catalog"],
    queryFn: () => getCatalogFn(),
  });

  useEffect(() => {
    if (settingsData) {
      setForm(settingsData);
    }
  }, [settingsData]);

  // 3. Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      return await saveSettingsFn({ data: form });
    },
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      qc.invalidateQueries({ queryKey: ["app-settings"] });
      qc.invalidateQueries({ queryKey: ["my-access"] });
      qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erro ao salvar configurações.";
      toast.error(msg);
    },
  });

  const handleUpdateForm = (updated: Partial<AppSettingsData>) => {
    setForm((prev) => ({ ...prev, ...updated }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando configurações do sistema...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações do Sistema</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie parâmetros operacionais, listas de bloqueio e diagnóstico de conexões.
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="h-9 gap-1.5 font-medium shadow-sm"
        >
          {saveMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Salvar Alterações
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="subgroups">Grupos & Subgrupos</TabsTrigger>
          <TabsTrigger value="connections">Diagnóstico</TabsTrigger>
          <TabsTrigger value="logs">Logs do Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettingsTab form={form} onChange={handleUpdateForm} />
        </TabsContent>

        <TabsContent value="subgroups">
          <SubgroupsTab
            form={form}
            subgroups={catalog.subgroups}
            groups={catalog.groups}
            onChange={handleUpdateForm}
            onRefreshCatalog={() => refetchCatalog()}
          />
        </TabsContent>

        <TabsContent value="connections">
          <ConnectionsTab />
        </TabsContent>

        <TabsContent value="logs">
          <SystemLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
