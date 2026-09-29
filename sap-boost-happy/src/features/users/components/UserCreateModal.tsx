import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface UserCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    email: string;
    fullName: string;
    role: "supervisor" | "operador";
    password: string;
  }) => Promise<void>;
  isSaving: boolean;
}

export function UserCreateModal({ open, onOpenChange, onSave, isSaving }: UserCreateModalProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"supervisor" | "operador">("operador");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail("");
      setFullName("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setRole("operador");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !fullName.trim()) {
      return toast.warning("Preencha todos os campos obrigatórios.");
    }

    if (password.length < 6) {
      return toast.warning("A senha provisória deve ter no mínimo 6 caracteres.");
    }

    if (password !== confirmPassword) {
      return toast.error("As senhas não coincidem. Verifique e tente novamente.");
    }

    await onSave({
      email: email.trim(),
      fullName: fullName.trim(),
      role,
      password,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh] overflow-hidden" autoComplete="off">
          <DialogHeader className="p-5 pb-3 border-b border-border/50 shrink-0">
            <DialogTitle className="text-lg font-semibold">Cadastrar Novo Usuário</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="create-fullname">Nome Completo</Label>
              <Input
                id="create-fullname"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Digite o nome completo"
                autoComplete="off"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="create-email">E-mail Corporativo</Label>
              <Input
                id="create-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@petruz.com"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Perfil de Acesso</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "supervisor" | "operador")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operador">Operador (Envio e Acompanhamento)</SelectItem>
                  <SelectItem value="supervisor">Supervisor (Acesso Total / Admin)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="create-pwd">Senha Provisória</Label>
              <div className="relative">
                <Input
                  id="create-pwd"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  title={showPassword ? "Ocultar senha" : "Ver senha"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="create-confirm-pwd">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id="create-confirm-pwd"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha provisória"
                  autoComplete="new-password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  title={showConfirmPassword ? "Ocultar senha" : "Ver senha"}
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive font-medium">
                  As senhas informadas não coincidem.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                O usuário será solicitado a redefinir a senha no primeiro acesso.
              </p>
            </div>
          </div>

          <DialogFooter className="p-4 pt-3 border-t border-border/50 bg-muted/20 shrink-0 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving || (!!confirmPassword && password !== confirmPassword)}
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cadastrar Usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
