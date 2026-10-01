import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccess } from "@/features/auth";
import { Loader2 } from "lucide-react";

export function RequireSupervisor({ children }: { children: React.ReactNode }) {
  const me = useServerFn(getMyAccess);
  const { data, isLoading } = useQuery({ queryKey: ["my-access"], queryFn: () => me() });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (data?.role !== "supervisor") {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Acesso restrito ao supervisor do sistema.
      </div>
    );
  }

  return <>{children}</>;
}
