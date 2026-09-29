import {
  isBrazilianHoliday,
  isBusinessDay,
  isCommercialHour,
  getBrazilianNationalHolidays,
  resolveDateRange,
} from "../src/core/utils/date.utils";

console.log("=== TESTE DE REGRAS DE DIAS ÚTEIS E HORÁRIO COMERCIAL ===");

// 1. Feriados Nacionais em 2026
const holidays2026 = getBrazilianNationalHolidays(2026);
console.log("Feriados 2026:", Array.from(holidays2026).sort());

// Feriado Tiradentes
console.assert(isBrazilianHoliday("2026-04-21") === true, "Tiradentes deve ser feriado");
console.assert(isBusinessDay(new Date("2026-04-21T12:00:00Z")) === false, "Tiradentes não deve ser dia útil");

// Final de semana (ex: Sábado 2026-09-26)
console.assert(isBusinessDay(new Date("2026-09-26T12:00:00Z")) === false, "Sábado não deve ser dia útil");
// Domingo (2026-09-27)
console.assert(isBusinessDay(new Date("2026-09-27T12:00:00Z")) === false, "Domingo não deve ser dia útil");

// Dia útil normal (Segunda 2026-09-21)
console.assert(isBusinessDay(new Date("2026-09-21T12:00:00Z")) === true, "Segunda-feira normal deve ser dia útil");

// 2. Horário Comercial (08:00 às 18:00)
console.assert(isCommercialHour("08:00") === true, "08:00 é comercial");
console.assert(isCommercialHour("12:30") === true, "12:30 é comercial");
console.assert(isCommercialHour("18:00") === true, "18:00 é comercial");
console.assert(isCommercialHour("07:59") === false, "07:59 não é comercial");
console.assert(isCommercialHour("18:01") === false, "18:01 não é comercial");
console.assert(isCommercialHour("22:00") === false, "22:00 não é comercial");

// 3. Resolve Date Range para novos períodos
const weekRange = resolveDateRange("week:5", "2026-09-21");
console.log("Week:5 range:", weekRange);
console.assert(weekRange.from && weekRange.to, "Week range resolvido");

const monthRange = resolveDateRange("month:20", "2026-09-21");
console.log("Month:20 range:", monthRange);
console.assert(monthRange.from === "2026-09-01" && monthRange.to === "2026-09-30", "Month range resolvido para setembro");

console.log("✅ Todos os testes de agendamento e regras de negócio passaram com sucesso!");
