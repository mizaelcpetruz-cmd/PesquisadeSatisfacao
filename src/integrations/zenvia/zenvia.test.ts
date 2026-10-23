import { describe, it, expect } from "vitest";
import { renderTemplate, buildTemplateVariables } from "./zenvia.server";

describe("zenvia.server - Templates e Variáveis", () => {
  describe("renderTemplate", () => {
    it("deve substituir variáveis {{chave}} pelos valores fornecidos", () => {
      const template = "Olá {{nome}}, sua nota fiscal {{numero_nf}} foi faturada por {{vendedor}}.";
      const vars = {
        nome: "João Silva",
        numero_nf: "12345",
        vendedor: "Carlos",
      };

      const result = renderTemplate(template, vars);
      expect(result).toBe("Olá João Silva, sua nota fiscal 12345 foi faturada por Carlos.");
    });

    it("deve tratar variáveis com espaços internos como {{ nome }}", () => {
      const template = "Prezado {{  nome  }}, obrigado pela compra!";
      const result = renderTemplate(template, { nome: "Maria" });
      expect(result).toBe("Prezado Maria, obrigado pela compra!");
    });

    it("deve substituir por vazio variáveis ausentes ou nulas", () => {
      const template = "NF: {{numero_nf}} - Contato: {{contato}}";
      const result = renderTemplate(template, { numero_nf: "999" });
      expect(result).toBe("NF: 999 - Contato: ");
    });

    it("deve retornar string vazia se o template for vazio ou nulo", () => {
      expect(renderTemplate("", {})).toBe("");
    });
  });

  describe("buildTemplateVariables", () => {
    it("deve montar as variáveis padrão com valores de fallback seguros", () => {
      const vars = buildTemplateVariables({
        cardName: "MERCADO BOM PRECO LTDA",
        contactName: "Roberto",
        docNum: 55443,
        formattedDate: "22/10/2026",
        salespersonName: "Ana Vendedora",
        surveyId: "surv-123",
        baseUrl: "https://pesquisa.petruz.com",
      });

      expect(vars.nome).toBe("Roberto");
      expect(vars.cliente).toBe("MERCADO BOM PRECO LTDA");
      expect(vars.numero_nf).toBe("55443");
      expect(vars.data).toBe("22/10/2026");
      expect(vars.vendedor).toBe("Ana Vendedora");
      expect(vars.id_pedido).toBe("surv-123");
      expect(vars.nota_url).toContain("surv-123");
    });
  });
});
