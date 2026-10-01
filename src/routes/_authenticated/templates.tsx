import { createFileRoute } from "@tanstack/react-router";
import { TemplatesView } from "@/features/templates";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({ meta: [{ title: "Mensagens — Pesquisa Petruz" }] }),
  component: TemplatesView,
});
