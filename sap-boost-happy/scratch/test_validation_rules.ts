import { validateAndFormatE164Mobile, isOptOutCommand, formatDisplayPhone } from "../src/core/utils/phone.utils.ts";

console.log("=== TESTES DE VALIDAÇÃO E.164 CELULAR BRASIL ===");

const testPhones = [
  { raw: "11999887766", expectedValid: true, expectedE164: "5511999887766", desc: "Celular 11 dígitos com DDD" },
  { raw: "+55 (11) 99988-7766", expectedValid: true, expectedE164: "5511999887766", desc: "Celular formatado com DDI" },
  { raw: "5511999887766", expectedValid: true, expectedE164: "5511999887766", desc: "Celular 13 dígitos puro" },
  { raw: "011999887766", expectedValid: true, expectedE164: "5511999887766", desc: "Celular com zero à esquerda no DDD" },
  { raw: "1133334444", expectedValid: false, desc: "Fixo 10 dígitos (deve rejeitar)" },
  { raw: "551133334444", expectedValid: false, desc: "Fixo 12 dígitos com DDI (deve rejeitar)" },
  { raw: "11899887766", expectedValid: false, desc: "11 dígitos sem dígito 9 (fixo/inválido)" },
  { raw: "999887766", expectedValid: false, desc: "Celular 9 dígitos sem DDD (deve rejeitar)" },
  { raw: "33334444", expectedValid: false, desc: "Fixo 8 dígitos sem DDD (deve rejeitar)" },
  { raw: "", expectedValid: false, desc: "Vazio (deve rejeitar)" },
  { raw: null, expectedValid: false, desc: "Nulo (deve rejeitar)" },
];

let allPassed = true;

for (const t of testPhones) {
  const res = validateAndFormatE164Mobile(t.raw);
  const ok = res.valid === t.expectedValid && (!t.expectedE164 || res.e164 === t.expectedE164);
  if (!ok) {
    allPassed = false;
    console.error(`❌ FALHA: ${t.desc} -> input: "${t.raw}", obtido:`, res);
  } else {
    console.log(`✅ OK: ${t.desc} -> ${res.valid ? `Válido (${res.e164})` : `Inválido (${res.error})`}`);
  }
}

console.log("\n=== TESTES DE RECONHECIMENTO DE OPT-OUT ('SAIR') ===");

const testOptOut = [
  { text: "Sair", expected: true },
  { text: "sair", expected: true },
  { text: "SAIR", expected: true },
  { text: "Parar", expected: true },
  { text: "stop", expected: true },
  { text: "cancelar", expected: true },
  { text: "Não quero mais receber", expected: true },
  { text: "favor cancelar envio", expected: true },
  { text: "descadastrar", expected: true },
  { text: "10", expected: false },
  { text: "Nota 9, ótimo atendimento!", expected: false },
  { text: "Gostei muito", expected: false },
];

for (const t of testOptOut) {
  const res = isOptOutCommand(t.text);
  if (res !== t.expected) {
    allPassed = false;
    console.error(`❌ FALHA: Opt-Out "${t.text}" -> esperado: ${t.expected}, obtido: ${res}`);
  } else {
    console.log(`✅ OK: "${t.text}" -> OptOut = ${res}`);
  }
}

if (allPassed) {
  console.log("\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!");
} else {
  console.error("\n❌ ALGUNS TESTES FALHARAM!");
  process.exit(1);
}
