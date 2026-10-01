/**
 * Centralized Date & Timezone utilities for Petruz System (America/Belem).
 */

export const TIMEZONE_BELEM = "America/Belem";

/**
 * Returns current Date in America/Belem timezone formatted as YYYY-MM-DD.
 */
export function getBrazilDateString(d: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE_BELEM,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
}

/**
 * Returns current time in America/Belem as HH:MM string.
 */
export function getBrazilTimeString(d: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE_BELEM,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(d);
  const hh = parts.find((p) => p.type === "hour")?.value || "00";
  const mm = parts.find((p) => p.type === "minute")?.value || "00";
  return `${hh}:${mm}`;
}

/**
 * Formats a Date or ISO string for user-facing localized display.
 */
export function formatLocalizedDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return "—";
  const dateObj = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(dateObj.getTime())) return "—";

  return dateObj.toLocaleString("pt-BR", {
    timeZone: TIMEZONE_BELEM,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formats a Date or ISO string for user-facing localized date only (DD/MM/YYYY).
 * Prevents UTC timezone shift (e.g. 2026-02-19T00:00:00Z being displayed as 18/02/2026 in UTC-3).
 */
export function formatLocalizedDate(dateInput?: string | Date | null): string {
  if (!dateInput) return "—";

  if (typeof dateInput === "string") {
    const match = dateInput.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return `${d}/${m}/${y}`;
    }
  }

  const dateObj = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(dateObj.getTime())) return "—";

  return dateObj.toLocaleDateString("pt-BR", {
    timeZone: TIMEZONE_BELEM,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Safely extracts YYYY-MM-DD from an SAP DocDate or timestamp string without timezone shift.
 */
export function formatInvoiceDateUTC(rawDate?: string | null): string {
  if (!rawDate) return "";
  const match = rawDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return rawDate;
    return d.toISOString().slice(0, 10);
  } catch {
    return rawDate;
  }
}

export type Granularity = "day" | "week" | "month" | "year" | "custom" | "failed";

/**
 * Returns ISO Week string (e.g. 2026-W38).
 */
export function getISOWeekString(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * Converts an ISO week string into start and end dates.
 */
export function getRangeFromWeek(weekStr: string): { from: string; to: string } {
  if (!weekStr || !weekStr.includes("-W")) {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return { from: fmt(today), to: fmt(today) };
  }
  const [yearStr, weekNumStr] = weekStr.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekNumStr, 10);

  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const ISOweekStart = new Date(simple);
  if (dow <= 4) {
    ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  } else {
    ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  }

  const weekEnd = new Date(ISOweekStart);
  weekEnd.setUTCDate(ISOweekStart.getUTCDate() + 6);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(ISOweekStart), to: fmt(weekEnd) };
}

/**
 * Resolves { from, to } string dates from granularity and reference.
 */
export function resolveDateRange(g: Granularity | string, ref: string): { from: string; to: string } {
  if (g === "failed") return { from: "failed", to: "failed" };
  if (g === "yesterday") {
    const d = new Date(`${ref}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    const yesterdayStr = d.toISOString().slice(0, 10);
    return { from: yesterdayStr, to: yesterdayStr };
  }
  if (g === "day") return { from: ref, to: ref };
  if (g === "week" || g.startsWith("week:")) return getRangeFromWeek(getISOWeekString(new Date(`${ref}T12:00:00Z`)));
  if (g === "month" || g.startsWith("month:")) {
    const [y, m] = ref.slice(0, 7).split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { from: `${ref.slice(0, 7)}-01`, to: `${ref.slice(0, 7)}-${String(last).padStart(2, "0")}` };
  }
  if (g === "year") return { from: `${ref.slice(0, 4)}-01-01`, to: `${ref.slice(0, 4)}-12-31` };
  return { from: ref, to: ref };
}

/**
 * Calculates Easter date for a given year using Meeus/Jones/Butcher algorithm.
 */
export function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Returns Brazilian national holidays (Feriados Nacionais e Facultativos Federais) for a given year.
 */
export function getBrazilianNationalHolidays(year: number): Set<string> {
  const holidays = new Set<string>();
  const pad = (n: number) => String(n).padStart(2, "0");
  const addFixed = (m: number, d: number) => holidays.add(`${year}-${pad(m)}-${pad(d)}`);

  // Feriados Nacionais Fixos (Brasil)
  addFixed(1, 1);   // Confraternização Universal
  addFixed(4, 21);  // Tiradentes
  addFixed(5, 1);   // Dia Mundial do Trabalho
  addFixed(9, 7);   // Independência do Brasil
  addFixed(10, 12); // Nossa Senhora Aparecida
  addFixed(11, 2);  // Finados
  addFixed(11, 15); // Proclamação da República
  addFixed(11, 20); // Dia Nacional de Zumbi e da Consciência Negra (Lei 14.759/2023)
  addFixed(12, 25); // Natal

  // Feriados Móveis baseados na Páscoa
  const easter = getEasterDate(year);
  const addOffset = (days: number) => {
    const d = new Date(easter.getTime() + days * 86400000);
    holidays.add(d.toISOString().slice(0, 10));
  };

  addOffset(-48); // Segunda-feira de Carnaval
  addOffset(-47); // Terça-feira de Carnaval
  addOffset(-2);  // Sexta-feira Santa (Paixão de Cristo)
  addOffset(60);  // Corpus Christi

  return holidays;
}

/**
 * Checks if a given Date or YYYY-MM-DD string is a Brazilian national holiday.
 */
export function isBrazilianHoliday(dateInput: Date | string = new Date()): boolean {
  const dateStr = typeof dateInput === "string" ? dateInput.slice(0, 10) : getBrazilDateString(dateInput);
  const year = parseInt(dateStr.slice(0, 4), 10);
  if (isNaN(year)) return false;
  const holidays = getBrazilianNationalHolidays(year);
  return holidays.has(dateStr);
}

/**
 * Checks whether a given Date is a Business Day in Brazil (Segunda a Sexta, sem feriados nacionais).
 */
export function isBusinessDay(date: Date = new Date()): boolean {
  const dateStr = getBrazilDateString(date);
  const [y, m, d] = dateStr.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Domingo, 6 = Sábado

  // Finais de semana
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // Feriados Nacionais
  if (isBrazilianHoliday(dateStr)) {
    return false;
  }

  return true;
}

/**
 * Validates whether a time string is within commercial hours (08:00 to 18:00).
 */
export function isCommercialHour(timeStr: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(timeStr)) return false;
  return timeStr >= "08:00" && timeStr <= "18:00";
}
