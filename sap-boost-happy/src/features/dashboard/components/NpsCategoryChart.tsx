import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface NpsCategoryChartProps {
  data: Array<{ name: string; value: number; color: string }>;
}

export function NpsCategoryChart({ data }: NpsCategoryChartProps) {
  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Classificação NPS</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full flex items-center justify-center">
          {data.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma resposta registrada ainda.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
