import { createFileRoute } from "@tanstack/react-router";
import { SurveysView } from "@/features/surveys";

export const Route = createFileRoute("/_authenticated/pesquisas")({
  head: () => ({ meta: [{ title: "Pesquisas — Pesquisa Petruz" }] }),
  component: SurveysView,
});
