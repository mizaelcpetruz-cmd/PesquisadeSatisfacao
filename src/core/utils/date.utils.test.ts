import { describe, it, expect } from "vitest";
import {
  isCommercialHour,
  isBusinessDay,
  isBrazilianHoliday,
  formatLocalizedDate,
  resolveDateRange,
} from "./date.utils";

describe("date.utils - Regras de Horário e Dias Úteis", () => {
  describe("isCommercialHour", () => {
    it("deve aprovar horários entre 08:00 e 18:00", () => {
      expect(isCommercialHour("08:00")).toBe(true);
      expect(isCommercialHour("12:30")).toBe(true);
      expect(isCommercialHour("18:00")).toBe(true);
    });

    it("deve rejeitar horários fora do intervalo comercial", () => {
      expect(isCommercialHour("07:59")).toBe(false);
      expect(isCommercialHour("18:01")).toBe(false);
      expect(isCommercialHour("22:00")).toBe(false);
      expect(isCommercialHour("03:15")).toBe(false);
    });

    it("deve rejeitar strings com formato inválido", () => {
      expect(isCommercialHour("invalid")).toBe(false);
      expect(isCommercialHour("8:00")).toBe(false);
      expect(isCommercialHour("")).toBe(false);
    });
  });

  describe("isBrazilianHoliday & isBusinessDay", () => {
    it("deve reconhecer feriados nacionais fixos (ex: Natal, Ano Novo, Tiradentes)", () => {
      expect(isBrazilianHoliday("2026-12-25")).toBe(true);
      expect(isBrazilianHoliday("2026-01-01")).toBe(true);
      expect(isBrazilianHoliday("2026-04-21")).toBe(true);
      expect(isBrazilianHoliday("2026-09-07")).toBe(true);
    });

    it("deve considerar dia útil uma terça-feira comum sem feriado", () => {
      // 2026-06-09 é terça-feira comum
      const d = new Date("2026-06-09T14:00:00Z");
      expect(isBusinessDay(d)).toBe(true);
    });

    it("não deve considerar dia útil no sábado ou domingo", () => {
      // 2026-06-13 é sábado
      const sabado = new Date("2026-06-13T14:00:00Z");
      expect(isBusinessDay(sabado)).toBe(false);

      // 2026-06-14 é domingo
      const domingo = new Date("2026-06-14T14:00:00Z");
      expect(isBusinessDay(domingo)).toBe(false);
    });

    it("não deve considerar dia útil um feriado em dia de semana", () => {
      // 2026-12-25 é Natal (sexta-feira em 2026)
      const natal = new Date("2026-12-25T14:00:00Z");
      expect(isBusinessDay(natal)).toBe(false);
    });
  });

  describe("formatLocalizedDate", () => {
    it("deve formatar data ISO YYYY-MM-DD para DD/MM/YYYY sem deslocamento de fuso", () => {
      expect(formatLocalizedDate("2026-10-22")).toBe("22/10/2026");
      expect(formatLocalizedDate("2026-01-05")).toBe("05/01/2026");
    });
  });

  describe("resolveDateRange", () => {
    it("deve resolver range correto para o dia", () => {
      const range = resolveDateRange("day", "2026-10-22");
      expect(range).toEqual({ from: "2026-10-22", to: "2026-10-22" });
    });

    it("deve resolver range correto para o ano", () => {
      const range = resolveDateRange("year", "2026-10-22");
      expect(range).toEqual({ from: "2026-01-01", to: "2026-12-31" });
    });
  });
});
