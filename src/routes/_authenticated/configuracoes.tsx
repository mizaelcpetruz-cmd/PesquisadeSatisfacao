import { createFileRoute } from "@tanstack/react-router";
import { SettingsView } from "@/features/settings";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Pesquisa Petruz" }] }),
  component: SettingsView,
});
