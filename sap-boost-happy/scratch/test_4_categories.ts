import {
  findScoreOverlap,
  getNormalizedCategory,
  getTemplateScoreRange,
  type MessageTemplateItem,
} from "../src/features/templates/types.ts";

console.log("=== TESTES DAS 4 CATEGORIAS & VALIDAÇÃO DE NÃO REPETIÇÃO DE INTERVALO ===");

const existingTemplates: MessageTemplateItem[] = [
  {
    id: "tpl-1",
    name: "Pesquisa Inicial Padrão",
    body: "Olá!",
    is_default: true,
    type: "inicial",
  },
  {
    id: "tpl-2",
    name: "Resposta Ruim (Notas 1 a 2)",
    body: "Sentimos muito!",
    is_default: true,
    type: "range:1:2",
  },
  {
    id: "tpl-3",
    name: "Resposta Boa (Nota 3)",
    body: "Excelente!",
    is_default: true,
    type: "range:3:3",
  },
  {
    id: "tpl-4",
    name: "Descadastro Opt-Out",
    body: "Você saiu!",
    is_default: true,
    type: "sair",
  },
];

// Test categories
console.log("1. Categorias Normalizadas:");
console.log("inicial ->", getNormalizedCategory("inicial")); // inicial
console.log("pesquisa ->", getNormalizedCategory("pesquisa")); // inicial
console.log("range:1:2 ->", getNormalizedCategory("range:1:2")); // intervalo
console.log("intervalo ->", getNormalizedCategory("intervalo")); // intervalo
console.log("final ->", getNormalizedCategory("final")); // final
console.log("agradecimento ->", getNormalizedCategory("agradecimento")); // final
console.log("sair ->", getNormalizedCategory("sair")); // sair
console.log("opt_out ->", getNormalizedCategory("opt_out")); // sair

// Test Overlaps
console.log("\n2. Testes de Sobreposição de Intervalos:");

// Tentativa A: Criar intervalo 2 a 3 (conflita com tpl-2 [1..2] e tpl-3 [3..3])
const testA = findScoreOverlap(2, 3, existingTemplates);
console.log("Tentativa 2 a 3 -> Conflito esperado: true | Obtido:", testA.conflict, `(Modelo: ${testA.conflictingTemplate?.name})`);

// Tentativa B: Criar intervalo 1 a 1 (conflita com tpl-2 [1..2])
const testB = findScoreOverlap(1, 1, existingTemplates);
console.log("Tentativa 1 a 1 -> Conflito esperado: true | Obtido:", testB.conflict, `(Modelo: ${testB.conflictingTemplate?.name})`);

// Tentativa C: Criar intervalo 3 a 3 (conflita com tpl-3 [3..3])
const testC = findScoreOverlap(3, 3, existingTemplates);
console.log("Tentativa 3 a 3 -> Conflito esperado: true | Obtido:", testC.conflict, `(Modelo: ${testC.conflictingTemplate?.name})`);

// Tentativa D: Criar intervalo 4 a 5 (LIVRE! Não conflita)
const testD = findScoreOverlap(4, 5, existingTemplates);
console.log("Tentativa 4 a 5 -> Conflito esperado: false | Obtido:", testD.conflict);

// Tentativa E: Editando tpl-2 mantendo 1 a 2 (Não deve conflitar consigo mesmo)
const testE = findScoreOverlap(1, 2, existingTemplates, "tpl-2");
console.log("Editando tpl-2 com 1 a 2 -> Conflito esperado: false | Obtido:", testE.conflict);

const allOk =
  testA.conflict === true &&
  testB.conflict === true &&
  testC.conflict === true &&
  testD.conflict === false &&
  testE.conflict === false;

if (allOk) {
  console.log("\n🎉 TODOS OS TESTES DE VALIDAÇÃO DE INTERVALO PASSARAM COM SUCESSO!");
} else {
  console.error("\n❌ ALGUNS TESTES FALHARAM!");
  process.exit(1);
}
