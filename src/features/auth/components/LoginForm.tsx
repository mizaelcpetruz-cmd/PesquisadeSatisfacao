import { useState, useEffect } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SatisfactionIcon } from "@/components/SatisfactionIcon";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then((res) => {
        if (res?.data?.user) navigate({ to: "/" });
      })
      .catch((err) => {
        console.warn("[LoginForm] Usuário não logado:", err);
      });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      return toast.error(error.message || "Credenciais inválidas. Verifique seu email e senha.");
    }
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md shadow-xl border-border/60 backdrop-blur-sm bg-card/95">
        <CardHeader className="space-y-3 text-center flex flex-col items-center pb-4">
          <div className="p-3 rounded-2xl bg-primary/10 ring-1 ring-primary/20 shadow-inner">
            <SatisfactionIcon className="size-12 shadow-sm" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Pesquisa de Satisfação Petruz
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Entre com suas credenciais para acessar o painel
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail corporativo</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu.email@petruz.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-10"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 font-semibold shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar no Sistema"
              )}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              ← Voltar para a página inicial
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
