import { createFileRoute } from "@tanstack/react-router";
import { DashboardView } from "@/features/dashboard";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Dashboard — Pesquisa Petruz" }] }),
  component: DashboardView,
});
