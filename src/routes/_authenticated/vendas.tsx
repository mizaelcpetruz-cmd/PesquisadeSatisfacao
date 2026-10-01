import { createFileRoute } from "@tanstack/react-router";
import { SalesView } from "@/features/sales";

export const Route = createFileRoute("/_authenticated/vendas")({
  head: () => ({ meta: [{ title: "Vendas — Pesquisa Petruz" }] }),
  component: SalesView,
});
