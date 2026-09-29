import {
  findScoreOverlap,
  getNormalizedCategory,
  getTemplateScoreRange,
  isTemplateActive,
  type MessageTemplateItem,
} from "../src/features/templates/types.ts";

console.log("=== TESTES DE ATIVAÇÃO / INATIVAÇÃO E PRIORIDADE DA RESPOSTA FINAL ===");

const templates: MessageTemplateItem[] = [
  {
    id: "tpl-intervalo-1-3",
    name: "Resposta Notas 1 a 3",
    body: "Mensagem personalizada para notas 1 a 3",
    is_default: true,
    type: "range:1:3", // Ativo
  },
  {
    id: "tpl-final-geral",
    name: "Resposta Final Geral",
    body: "Mensagem Final Geral de Agradecimento!",
    is_default: true,
    type: "final", // Ativo
  },
];

function resolveFeedbackMessage(score: number, allTemplates: MessageTemplateItem[]): string {
  const activeCandidates = allTemplates
    .filter((t) => isTemplateActive(t))
    .map((t) => ({
      ...t,
      range: getTemplateScoreRange(t),
      category: getNormalizedCategory(t.type),
    }));

  // 1. Procura intervalo ativo
  const matchingIntervals = activeCandidates.filter(
    (t) => t.category === "intervalo" && t.range && score >= t.range.min && score <= t.range.max,
  );

  if (matchingIntervals.length > 0) {
    return matchingIntervals[0].body;
  }

  // 2. Se notas estiverem inativas ou sem cadastro -> usa Final Geral
  const finalTemplate = activeCandidates.find((t) => t.category === "final");
  if (finalTemplate) {
    return finalTemplate.body;
  }

  return "Fallback Sistema";
}

// Caso 1: Intervalo 1-3 ATIVO -> Nota 2 recebe mensagem do intervalo
const msg1 = resolveFeedbackMessage(2, templates);
console.log("1. Intervalo 1-3 ATIVO -> Nota 2 recebeu:", msg1);
const ok1 = msg1 === "Mensagem personalizada para notas 1 a 3";

// Caso 2: Intervalo 1-3 INATIVO -> Nota 2 deve receber a Resposta Final Geral
const templatesComIntervaloInativo: MessageTemplateItem[] = [
  {
    ...templates[0],
    type: "inactive:range:1:3", // INATIVO
  },
  templates[1], // Final Geral ATIVO
];

const msg2 = resolveFeedbackMessage(2, templatesComIntervaloInativo);
console.log("2. Intervalo 1-3 INATIVO -> Nota 2 recebeu:", msg2);
const ok2 = msg2 === "Mensagem Final Geral de Agradecimento!";

// Caso 3: Inativação libera intervalo para novo cadastro sem conflito
const overlapComInativo = findScoreOverlap(1, 3, templatesComIntervaloInativo);
console.log("3. Teste de sobreposição com intervalo inativo (esperado: false) ->", overlapComInativo.conflict);
const ok3 = overlapComInativo.conflict === false;

const allPass = ok1 && ok2 && ok3;

if (allPass) {
  console.log("\n🎉 TODOS OS TESTES DE INATIVAÇÃO E PRIORIDADE PASSARAM COM 100% DE SUCESSO!");
} else {
  console.error("\n❌ ALGUNS TESTES FALHARAM!");
  process.exit(1);
}
