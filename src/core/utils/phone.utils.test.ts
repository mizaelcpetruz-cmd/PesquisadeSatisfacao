import { describe, it, expect } from "vitest";
import { validateAndFormatE164Mobile } from "./phone.utils";

describe("phone.utils - validateAndFormatE164Mobile", () => {
  it("deve validar e formatar celular com DDD e 9 dígitos (ex: 91981234567)", () => {
    const res = validateAndFormatE164Mobile("91981234567");
    expect(res.valid).toBe(true);
    expect(res.e164).toBe("5591981234567");
  });

  it("deve aceitar número formatado com parênteses, espaços e traços", () => {
    const res = validateAndFormatE164Mobile("(91) 98123-4567");
    expect(res.valid).toBe(true);
    expect(res.e164).toBe("5591981234567");
  });

  it("deve aceitar número que já contenha o DDI 55", () => {
    const res = validateAndFormatE164Mobile("+55 (91) 98123-4567");
    expect(res.valid).toBe(true);
    expect(res.e164).toBe("5591981234567");
  });

  it("deve rejeitar e sinalizar telefone fixo (8 dígitos com DDI ou sem 9º dígito)", () => {
    const resSemDdi = validateAndFormatE164Mobile("(91) 3222-1111");
    expect(resSemDdi.valid).toBe(false);
    expect(resSemDdi.isLandline).toBe(true);

    const resComDdi = validateAndFormatE164Mobile("559132221111");
    expect(resComDdi.valid).toBe(false);
    expect(resComDdi.isLandline).toBe(true);
  });

  it("deve rejeitar valores vazios, nulos ou indefinidos", () => {
    expect(validateAndFormatE164Mobile("").valid).toBe(false);
    expect(validateAndFormatE164Mobile(null).valid).toBe(false);
    expect(validateAndFormatE164Mobile(undefined).valid).toBe(false);
    expect(validateAndFormatE164Mobile("abc-xyz").valid).toBe(false);
  });
});
