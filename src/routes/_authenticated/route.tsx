import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProfilePasswordDialog } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { SatisfactionIcon } from "@/components/SatisfactionIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  BarChart3,
  FileText,
  MessageSquare,
  ClipboardList,
  CalendarClock,
  LogOut,
  Users,
  Settings,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  Shield,
  KeyRound,
  Menu,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/auth" });
    return { user: data.session.user };
  },
  component: AuthedLayout,
});

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const NAV_MAIN: NavItem[] = [
  { to: "/", label: "Dashboard", icon: BarChart3 },
  { to: "/vendas", label: "Notas Fiscais (SAP)", icon: FileText },
  { to: "/pesquisas", label: "Pesquisas", icon: ClipboardList },
  { to: "/templates", label: "Mensagens", icon: MessageSquare },
  { to: "/agendamentos", label: "Agendamentos", icon: CalendarClock },
];

const NAV_ADMIN: NavItem[] = [
  { to: "/usuarios", label: "Usuários", icon: Users, adminOnly: true },
  { to: "/configuracoes", label: "Configurações", icon: Settings, adminOnly: true },
];

/**
 * Extracts initials of First and Last name (e.g. "Tiago Fonseca" -> "TF").
 */
const getInitials = (name?: string | null, email?: string | null): string => {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0][0].toUpperCase();
    }
  }
  if (email) {
    const userPart = email.split("@")[0];
    const emailParts = userPart.split(/[._-]/).filter(Boolean);
    if (emailParts.length >= 2) {
      return `${emailParts[0][0]}${emailParts[1][0]}`.toUpperCase();
    }
    return userPart.slice(0, 2).toUpperCase();
  }
  return "PT";
};

function AuthedLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: me } = useQuery({
    queryKey: ["my-access"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return null;

      const [profileRes, rolesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, full_name, status, require_password_change, phone")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      const profile = profileRes.data;
      const roleList = (rolesRes.data ?? []).map((r) => r.role);
      const isAdmin = roleList.includes("admin");

      return {
        userId: user.id,
        email: profile?.email ?? user.email ?? null,
        fullName: profile?.full_name ?? (user.user_metadata?.full_name as string) ?? null,
        phone: profile?.phone ?? null,
        status: ((profile?.status as "pending" | "approved" | "rejected") || "pending"),
        role: isAdmin ? ("supervisor" as const) : ("operador" as const),
        requirePasswordChange: !!profile?.require_password_change,
        currentEnvironment: "production" as const,
      };
    },
    staleTime: 5 * 60_000,
  });

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  const isSupervisor = me?.role === "supervisor";

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row text-foreground transition-colors duration-200">
      {/* Desktop Left Sidebar (Hidden on small mobile screens, sticky on tablet/desktop) */}
      <aside
        className={`hidden md:flex border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out flex-col justify-between shrink-0 ${
          isCollapsed ? "w-20" : "w-64"
        } sticky top-0 h-screen z-20 overflow-hidden select-none`}
      >
        {/* Top Sidebar Header with Always-Visible Petruz Logo */}
        <div className="h-16 flex items-center border-b border-sidebar-border px-4 shrink-0 overflow-hidden">
          <Link
            to="/"
            className="flex items-center gap-3 overflow-hidden group w-full"
            title="Pesquisa de Satisfação Petruz"
          >
            <SatisfactionIcon className="size-9 shrink-0 transition-transform duration-200 group-hover:scale-105" />
            <div
              className={`flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                isCollapsed
                  ? "max-w-0 opacity-0 -translate-x-3 pointer-events-none"
                  : "max-w-[180px] opacity-100 translate-x-0"
              }`}
            >
              <div className="font-bold text-sm tracking-tight text-sidebar-foreground truncate">
                Petruz Satisfação
              </div>
              <div className="text-[10px] text-sidebar-foreground/60 font-medium uppercase tracking-wider truncate">
                Vendas & Marketing
              </div>
            </div>
          </Link>
        </div>

        {/* Scrollable Navigation Items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-6">
          {/* Main Menu */}
          <div className="space-y-1">
            <div
              className={`px-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/50 whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                isCollapsed
                  ? "max-h-0 opacity-0 pb-0 -translate-x-2 pointer-events-none"
                  : "max-h-6 opacity-100 pb-1.5 translate-x-0"
              }`}
            >
              Navegação
            </div>

            {NAV_MAIN.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group overflow-hidden ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="size-5 shrink-0 transition-transform duration-200 group-hover:scale-105" />
                  <span
                    className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                      isCollapsed
                        ? "max-w-0 opacity-0 -translate-x-3 pointer-events-none"
                        : "max-w-[180px] opacity-100 translate-x-0"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Supervisor Menu */}
          {isSupervisor && (
            <div className="space-y-1 pt-2 border-t border-sidebar-border/60">
              <div
                className={`px-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/50 whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                  isCollapsed
                    ? "max-h-0 opacity-0 pb-0 -translate-x-2 pointer-events-none"
                    : "max-h-6 opacity-100 pb-1.5 translate-x-0"
                }`}
              >
                Supervisão
              </div>

              {NAV_ADMIN.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group overflow-hidden ${
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="size-5 shrink-0 transition-transform duration-200 group-hover:scale-105" />
                    <span
                      className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                        isCollapsed
                          ? "max-w-0 opacity-0 -translate-x-3 pointer-events-none"
                          : "max-w-[180px] opacity-100 translate-x-0"
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* Sidebar Footer: Pinned Bottom Collapse Toggle Button */}
        <div className="p-3 border-t border-sidebar-border shrink-0 bg-sidebar overflow-hidden">
          <Button
            variant="ghost"
            className="w-full text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent flex items-center gap-3.5 px-3.5 h-10 transition-all duration-200 overflow-hidden"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="size-5 shrink-0" />
            ) : (
              <PanelLeftClose className="size-5 shrink-0" />
            )}
            <span
              className={`text-xs font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                isCollapsed
                  ? "max-w-0 opacity-0 -translate-x-3 pointer-events-none"
                  : "max-w-[180px] opacity-100 translate-x-0"
              }`}
            >
              Recolher Menu
            </span>
          </Button>
        </div>
      </aside>

      {/* Mobile Drawer (Sheet) for small screens */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border text-sidebar-foreground">
          <SheetHeader className="h-16 px-4 border-b border-sidebar-border flex flex-row items-center gap-3 space-y-0 text-left">
            <SatisfactionIcon className="size-8 shrink-0" />
            <div className="flex flex-col truncate">
              <SheetTitle className="font-bold text-sm text-sidebar-foreground truncate">
                Petruz Satisfação
              </SheetTitle>
              <div className="text-[10px] text-sidebar-foreground/60 font-medium uppercase tracking-wider">
                Vendas & Marketing
              </div>
            </div>
          </SheetHeader>

          <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/50 pb-1.5">
                Navegação
              </div>
              {NAV_MAIN.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {isSupervisor && (
              <div className="space-y-1 pt-2 border-t border-sidebar-border/60">
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/50 pb-1.5">
                  Supervisão
                </div>
                {NAV_ADMIN.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <Icon className="size-5 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Main Content Area with Top Header */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-border bg-card/40 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-10">
          {/* Mobile Hamburger Menu Button & Logo */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden size-9 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(true)}
              title="Abrir menu de navegação"
            >
              <Menu className="size-5" />
            </Button>
            <div className="flex items-center gap-2 md:hidden">
              <SatisfactionIcon className="size-7" />
              <span className="font-bold text-sm tracking-tight">Petruz</span>
            </div>
          </div>

          {/* Right Header Actions: Theme Switch & User Avatar Circle */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="size-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80"
              title={`Alternar para tema ${theme === "dark" ? "claro" : "escuro"}`}
            >
              {theme === "dark" ? (
                <Sun className="size-4.5 text-amber-400" />
              ) : (
                <Moon className="size-4.5 text-purple-700" />
              )}
            </Button>

            {/* User Profile Avatar Circle ("Bolinha com as iniciais do nome e sobrenome") */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-full ring-2 ring-primary/30 hover:ring-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  title={`${me?.fullName || "Usuário"} (${me?.email})`}
                >
                  <Avatar className="size-9 cursor-pointer border border-primary/20 bg-primary/10">
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs tracking-wider">
                      {getInitials(me?.fullName, me?.email)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 shadow-xl">
                <DropdownMenuLabel className="p-2">
                  <div className="font-semibold text-sm text-foreground">
                    {me?.fullName || "Usuário do Sistema"}
                  </div>
                  <div className="text-xs text-muted-foreground font-normal truncate">
                    {me?.email}
                  </div>
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary/15 text-primary">
                      <Shield className="size-3" />
                      {isSupervisor ? "Supervisor / Administrador" : "Operador"}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => setProfileDialogOpen(true)}
                  className="gap-2.5 cursor-pointer py-2"
                >
                  <KeyRound className="size-4 text-muted-foreground" />
                  <span>Meu Perfil / Alterar Senha</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="gap-2.5 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer py-2"
                >
                  <LogOut className="size-4" />
                  <span>Sair do Sistema</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content: Adaptive fluid container for all monitor sizes */}
        <main className="flex-1 w-full max-w-[1700px] mx-auto p-3.5 sm:p-5 md:p-8 min-w-0">
          {me?.status === "pending" ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-2xl border border-border shadow-sm max-w-lg mx-auto mt-12">
              <Shield className="size-12 text-amber-500 mb-4 animate-pulse" />
              <h2 className="text-xl font-bold">Cadastro Pendente de Aprovação</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Sua conta corporativa foi criada com sucesso, mas ainda necessita da aprovação de um supervisor para acessar os dados e funcionalidades do sistema.
              </p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* Profile & Password Management Modal */}
      <ProfilePasswordDialog
        open={profileDialogOpen || !!me?.requirePasswordChange}
        onOpenChange={setProfileDialogOpen}
        accessData={me}
        forcePasswordChange={!!me?.requirePasswordChange}
      />
    </div>
  );
}
