import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/features/auth";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Entrar — Pesquisa Petruz" }] }),
  component: LoginForm,
});
