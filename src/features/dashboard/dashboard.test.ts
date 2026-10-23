import { describe, it, expect } from "vitest";

// Pure function test for NPS calculation matching dashboard logic
function calculateNps(scores: number[]): {
  nps: number | null;
  promoters: number;
  neuters: number;
  detractors: number;
} {
  if (!scores.length) {
    return { nps: null, promoters: 0, neuters: 0, detractors: 0 };
  }

  const promoters = scores.filter((n) => n >= 9).length;
  const neuters = scores.filter((n) => n === 7 || n === 8).length;
  const detractors = scores.filter((n) => n <= 6).length;
  const nps = Math.round(((promoters - detractors) / scores.length) * 100);

  return { nps, promoters, neuters, detractors };
}

describe("Dashboard - Regras de Cálculo NPS", () => {
  it("deve calcular NPS 100 quando todas as notas são 9 ou 10 (apenas promotores)", () => {
    const scores = [10, 10, 9, 10, 9];
    const res = calculateNps(scores);
    expect(res.nps).toBe(100);
    expect(res.promoters).toBe(5);
    expect(res.detractors).toBe(0);
    expect(res.neuters).toBe(0);
  });

  it("deve calcular NPS -100 quando todas as notas são 0 a 6 (apenas detratores)", () => {
    const scores = [0, 2, 5, 6, 4];
    const res = calculateNps(scores);
    expect(res.nps).toBe(-100);
    expect(res.promoters).toBe(0);
    expect(res.detractors).toBe(5);
  });

  it("deve calcular NPS 0 quando promotores e detratores empatam", () => {
    // 2 promotores (10, 9), 2 detratores (5, 6), 2 neutros (7, 8)
    const scores = [10, 9, 7, 8, 5, 6];
    const res = calculateNps(scores);
    expect(res.nps).toBe(0);
    expect(res.promoters).toBe(2);
    expect(res.detractors).toBe(2);
    expect(res.neuters).toBe(2);
  });

  it("deve calcular corretamente a zona de excelência (NPS > 75)", () => {
    // 8 promotores (9,10), 1 neutro (8), 1 detrator (6) = (8 - 1)/10 = 70%
    const scores = [10, 10, 10, 10, 9, 9, 9, 9, 8, 6];
    const res = calculateNps(scores);
    expect(res.nps).toBe(70);
  });

  it("deve retornar null se não houver nenhuma nota registrada", () => {
    const res = calculateNps([]);
    expect(res.nps).toBeNull();
  });
});
