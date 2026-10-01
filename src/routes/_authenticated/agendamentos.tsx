import { createFileRoute } from "@tanstack/react-router";
import { SchedulesView } from "@/features/schedules";

export const Route = createFileRoute("/_authenticated/agendamentos")({
  head: () => ({ meta: [{ title: "Agendamentos — Pesquisa Petruz" }] }),
  component: SchedulesView,
});
