import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createUser, updateUserRole, resetUserPassword } from "../users.functions";
import { UserCreateModal } from "./UserCreateModal";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Key, Shield, User, Loader2, RotateCcw, Eye, EyeOff } from "lucide-react";
import { formatLocalizedDate } from "@/core/utils/date.utils";
import type { UserItem } from "../types";

export function UsersView() {
  const qc = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Password reset dialog state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserItem | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  const createUserFn = useServerFn(createUser);
  const updateRoleFn = useServerFn(updateUserRole);
  const resetPwdFn = useServerFn(resetUserPassword);

  // 1. Query Users directly via Supabase Client (Parallel and cached)
  const {
    data: users = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["users-list"],
    queryFn: async (): Promise<UserItem[]> => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, full_name, status, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      if (profilesRes.error) throw new Error(profilesRes.error.message);
      if (rolesRes.error) throw new Error(rolesRes.error.message);

      const roles = rolesRes.data ?? [];
      const roleByUser = new Map<string, string[]>();
      for (const r of roles) {
        const arr = roleByUser.get(r.user_id as string) ?? [];
        arr.push(r.role as string);
        roleByUser.set(r.user_id as string, arr);
      }

      return (profilesRes.data ?? []).map((p) => {
        const rs = roleByUser.get(p.id as string) ?? [];
        return {
          id: p.id as string,
          email: p.email as string | null,
          fullName: p.full_name as string | null,
          status: "approved" as const,
          createdAt: p.created_at as string,
          role: rs.includes("admin") ? ("supervisor" as const) : ("operador" as const),
        };
      });
    },
    staleTime: 30_000,
  });

  // 2. Create User Mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      email: string;
      fullName: string;
      role: "supervisor" | "operador";
      password: string;
    }) => {
      return createUserFn({ data });
    },
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      setCreateModalOpen(false);
      qc.invalidateQueries({ queryKey: ["users-list"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erro ao criar usuário.";
      toast.error(msg);
    },
  });

  // 3. Update Role Mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "supervisor" | "operador" }) => {
      return updateRoleFn({ data: { userId, role } });
    },
    onSuccess: () => {
      toast.success("Permissão atualizada.");
      qc.invalidateQueries({ queryKey: ["users-list"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erro ao alterar papel do usuário.";
      toast.error(msg);
    },
  });

  // 4. Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserForReset || resetPasswordVal.length < 6) {
        throw new Error("A senha deve ter no mínimo 6 caracteres.");
      }
      return resetPwdFn({
        data: {
          userId: selectedUserForReset.id,
          newPassword: resetPasswordVal,
        },
      });
    },
    onSuccess: () => {
      toast.success("Senha redefinida com sucesso!");
      setResetDialogOpen(false);
      setResetPasswordVal("");
      setSelectedUserForReset(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erro ao redefinir senha.";
      toast.error(msg);
    },
  });

  const handleOpenReset = (user: UserItem) => {
    setSelectedUserForReset(user);
    setResetPasswordVal("");
    setResetDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Controle de acesso baseado em papéis (RBAC): cadastre operadores e defina permissões de
            supervisão.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 gap-1.5"
          >
            <RotateCcw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="h-9 gap-1.5 font-medium shadow-sm"
          >
            <Plus className="size-4" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando lista de usuários...</p>
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden bg-card shadow-sm">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil de Acesso</TableHead>
                <TableHead>Cadastrado Em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-semibold text-sm">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {u.fullName ? u.fullName.slice(0, 2).toUpperCase() : "US"}
                      </div>
                      <span>{u.fullName || "Sem nome"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(val) =>
                        updateRoleMutation.mutate({
                          userId: u.id,
                          role: val as "supervisor" | "operador",
                        })
                      }
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operador">
                          <div className="flex items-center gap-1.5">
                            <User className="size-3.5 text-muted-foreground" />
                            <span>Operador</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="supervisor">
                          <div className="flex items-center gap-1.5">
                            <Shield className="size-3.5 text-primary" />
                            <span className="font-semibold text-primary">Supervisor</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatLocalizedDate(u.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => handleOpenReset(u)}
                    >
                      <Key className="size-3.5" />
                      Redefinir Senha
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* User Create Modal */}
      <UserCreateModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSave={async (data) => {
          await createMutation.mutateAsync(data);
        }}
        isSaving={createMutation.isPending}
      />

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redefinir Senha de {selectedUserForReset?.fullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="reset-new-pwd">Nova Senha Provisória</Label>
              <div className="relative">
                <Input
                  id="reset-new-pwd"
                  type={showResetPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  title={showResetPassword ? "Ocultar senha" : "Ver senha"}
                >
                  {showResetPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                O usuário será obrigado a trocar esta senha no próximo login.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => resetPasswordMutation.mutate()}
              disabled={resetPasswordVal.length < 6 || resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Redefinir Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
