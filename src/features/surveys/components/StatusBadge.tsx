import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pendente", cls: "bg-muted text-muted-foreground border-border" },
    sent: {
      label: "Enviada",
      cls: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 font-medium",
    },
    answered: {
      label: "Respondida",
      cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 font-semibold",
    },
    failed: {
      label: "Falhou",
      cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-medium whitespace-nowrap",
    },
  };

  const m = map[status] ?? map.pending;
  return (
    <Badge variant="outline" className={m.cls}>
      {m.label}
    </Badge>
  );
}
