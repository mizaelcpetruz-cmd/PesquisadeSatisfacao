import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { updateMyPassword, updateMyEmail, updateMyProfileDetails } from "../auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Key, Mail, User, Phone, Loader2 } from "lucide-react";
import type { UserProfileAccess } from "../types";

interface ProfilePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessData?: UserProfileAccess | null;
  forcePasswordChange?: boolean;
}

export function ProfilePasswordDialog({
  open,
  onOpenChange,
  accessData,
  forcePasswordChange = false,
}: ProfilePasswordDialogProps) {
  const qc = useQueryClient();
  const updatePwd = useServerFn(updateMyPassword);
  const updateEmail = useServerFn(updateMyEmail);
  const updateProfile = useServerFn(updateMyProfileDetails);

  const [activeTab, setActiveTab] = useState<"password" | "profile" | "email">("password");

  // State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPwd, setLoadingPwd] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);

  useEffect(() => {
    if (accessData) {
      setFullName(accessData.fullName || "");
      setPhone(accessData.phone || "");
      setNewEmail(accessData.email || "");
    }
  }, [accessData]);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      return toast.error("A senha deve ter no mínimo 6 caracteres.");
    }
    if (newPassword !== confirmPassword) {
      return toast.error("As senhas informadas não coincidem.");
    }

    setLoadingPwd(true);
    try {
      await updatePwd({ data: { newPassword } });
      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
      await qc.invalidateQueries({ queryKey: ["my-access"] });
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao alterar senha.";
      toast.error(msg);
    } finally {
      setLoadingPwd(false);
    }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (fullName.trim().length < 2) {
      return toast.error("O nome deve ter no mínimo 2 caracteres.");
    }

    setLoadingProfile(true);
    try {
      await updateProfile({ data: { fullName, phone } });
      toast.success("Perfil atualizado com sucesso!");
      await qc.invalidateQueries({ queryKey: ["my-access"] });
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao atualizar perfil.";
      toast.error(msg);
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.includes("@")) {
      return toast.error("Insira um endereço de e-mail válido.");
    }

    setLoadingEmail(true);
    try {
      await updateEmail({ data: { newEmail } });
      toast.success("E-mail atualizado com sucesso!");
      await qc.invalidateQueries({ queryKey: ["my-access"] });
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao atualizar e-mail.";
      toast.error(msg);
    } finally {
      setLoadingEmail(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={forcePasswordChange ? () => {} : onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] flex flex-col p-6 overflow-y-auto shadow-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Key className="size-5 text-primary" />
            {forcePasswordChange ? "Alteração Obrigatória de Senha" : "Meu Perfil & Segurança"}
          </DialogTitle>
          <DialogDescription>
            {forcePasswordChange
              ? "Por motivos de segurança, você deve definir uma nova senha pessoal antes de continuar."
              : "Gerencie seus dados de acesso e credenciais de login."}
          </DialogDescription>
        </DialogHeader>

        {!forcePasswordChange && (
          <div className="flex border-b border-border mb-4">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "password"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("password")}
            >
              Senha
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "profile"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("profile")}
            >
              Dados Pessoais
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "email"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("email")}
            >
              E-mail
            </button>
          </div>
        )}

        {activeTab === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              {!forcePasswordChange && (
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" disabled={loadingPwd}>
                {loadingPwd ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar Nova Senha
              </Button>
            </div>
          </form>
        )}

        {activeTab === "profile" && !forcePasswordChange && (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <Input
                id="phone"
                type="text"
                placeholder="(91) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loadingProfile}>
                {loadingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar Perfil
              </Button>
            </div>
          </form>
        )}

        {activeTab === "email" && !forcePasswordChange && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail">Novo Endereço de E-mail</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loadingEmail}>
                {loadingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Atualizar E-mail
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
