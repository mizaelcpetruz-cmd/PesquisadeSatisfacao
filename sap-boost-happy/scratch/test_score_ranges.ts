import { getTemplateScoreRange, type MessageTemplateItem } from "../src/features/templates/types.ts";

console.log("=== TESTES DE INTERVALO DE NOTAS CUSTOMIZÁVEIS ===");

const sampleTemplates: MessageTemplateItem[] = [
  {
    id: "1",
    name: "Resposta Escala 1 a 3 - Ruim (Nota 1)",
    body: "Sentimos muito pela sua experiência nota 1. Vamos entrar em contato para entender o que houve.",
    is_default: true,
    type: "range:1:1",
  },
  {
    id: "2",
    name: "Resposta Escala 1 a 3 - Médio (Nota 2)",
    body: "Agradecemos o retorno nota 2! Vamos buscar aprimorar nossos processos.",
    is_default: true,
    type: "range:2:2",
  },
  {
    id: "3",
    name: "Resposta Escala 1 a 3 - Excelente (Nota 3)",
    body: "Ficamos extremamente felizes com sua nota 3! Muito obrigado pela confiança.",
    is_default: true,
    type: "range:3:3",
  },
  {
    id: "4",
    name: "Resposta Ampla - Notas 8 a 10",
    body: "Obrigado pela excelente avaliação (8 a 10)!",
    is_default: false,
    type: "range:8:10",
  },
];

function findMatchingTemplate(templates: MessageTemplateItem[], score: number): MessageTemplateItem | null {
  const candidates = templates.map((t) => ({
    ...t,
    range: getTemplateScoreRange(t),
  }));

  const matching = candidates.filter(
    (t) => t.range && score >= t.range.min && score <= t.range.max,
  );

  if (matching.length === 0) return null;

  matching.sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    const ampA = (a.range?.max ?? 10) - (a.range?.min ?? 0);
    const ampB = (b.range?.max ?? 10) - (b.range?.min ?? 0);
    return ampA - ampB;
  });

  return matching[0];
}

const testCases = [
  { score: 1, expectedId: "1" },
  { score: 2, expectedId: "2" },
  { score: 3, expectedId: "3" },
  { score: 9, expectedId: "4" },
  { score: 5, expectedId: null },
];

let allPassed = true;

for (const tc of testCases) {
  const matched = findMatchingTemplate(sampleTemplates, tc.score);
  const matchedId = matched ? matched.id : null;
  const ok = matchedId === tc.expectedId;
  if (!ok) {
    allPassed = false;
    console.error(`❌ FALHA: Score ${tc.score} -> esperado: ${tc.expectedId}, obtido: ${matchedId}`);
  } else {
    console.log(`✅ OK: Score ${tc.score} -> Template casado: "${matched?.name ?? "Nenhum (Fallback Padrão)"}"`);
  }
}

if (allPassed) {
  console.log("\n🎉 TODOS OS TESTES DE INTERVALO PASSARAM COM SUCESSO!");
} else {
  process.exit(1);
}
