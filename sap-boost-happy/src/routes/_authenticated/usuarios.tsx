import { createFileRoute } from "@tanstack/react-router";
import { UsersView } from "@/features/users";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Pesquisa Petruz" }] }),
  component: UsersView,
});
