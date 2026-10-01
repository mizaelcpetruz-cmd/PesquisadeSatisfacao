import type { SaleRow } from "@/integrations/sap/sap.types";

export type { SaleRow };

export interface SalesFilterState {
  granularity: "day" | "week" | "month" | "year" | "custom";
  day: string;
  week: string;
  month: string;
  year: string;
  from: string;
  to: string;
}
