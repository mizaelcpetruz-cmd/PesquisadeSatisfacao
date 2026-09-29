import { Badge } from "@/components/ui/badge";

interface ScoreBadgeProps {
  score: number | null | undefined;
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  if (score == null) return <span className="text-muted-foreground font-medium">—</span>;

  if (score >= 9) {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 font-bold">
        {score} (Promotor)
      </Badge>
    );
  }
  if (score >= 7) {
    return (
      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20 font-bold">
        {score} (Neutro)
      </Badge>
    );
  }
  return (
    <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20 font-bold">
      {score} (Detrator)
    </Badge>
  );
}
