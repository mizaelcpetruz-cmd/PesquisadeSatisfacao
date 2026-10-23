/**
 * Phone number utilities.
 * Validates, formats, and sanitizes phone numbers strictly adhering
 * to Brazilian mobile phone standards and E.164 specifications.
 */

export interface PhoneValidationResult {
  valid: boolean;
  e164?: string;
  error?: string;
  isLandline?: boolean;
}

/**
 * Validates and sanitizes a phone number to ensure it is a valid Brazilian mobile phone
 * in E.164 format (55 + 2 DDD digits + 9 digits starting with 9 = 13 digits total).
 * Rejects landline numbers and incomplete/invalid phone formats.
 */
export function validateAndFormatE164Mobile(raw: string | null | undefined): PhoneValidationResult {
  if (!raw) {
    return { valid: false, error: "Telefone não informado ou vazio" };
  }

  let digits = raw.replace(/\D+/g, "");
  if (!digits) {
    return { valid: false, error: "Nenhum dígito numérico encontrado no telefone" };
  }

  // Remove single leading zero if someone typed 011999998888
  if (digits.startsWith("0") && digits.length > 10) {
    digits = digits.slice(1);
  }

  // Case 1: 13 digits starting with 55 (55 + DDD[2] + 9[1] + 8 digits)
  if (digits.startsWith("55") && digits.length === 13) {
    const ninthDigit = digits[4];
    if (ninthDigit !== "9") {
      return {
        valid: false,
        isLandline: true,
        error: `Telefone fixo detectado (${digits}). Apenas celulares com o 9º dígito são aceitos para WhatsApp.`,
      };
    }
    return { valid: true, e164: digits };
  }

  // Case 2: 12 digits starting with 55 (55 + DDD[2] + 8 digits -> Landline with DDI)
  if (digits.startsWith("55") && digits.length === 12) {
    return {
      valid: false,
      isLandline: true,
      error: `Telefone fixo detectado com DDI (${digits}). Necessário celular com 9 dígitos.`,
    };
  }

  // Case 3: 11 digits (DDD[2] + 9[1] + 8 digits)
  if (digits.length === 11) {
    const ninthDigit = digits[2];
    if (ninthDigit !== "9") {
      return {
        valid: false,
        isLandline: true,
        error: `Telefone fixo ou número irregular com 11 dígitos (${digits}). O primeiro dígito após o DDD deve ser 9.`,
      };
    }
    return { valid: true, e164: `55${digits}` };
  }

  // Case 4: 10 digits (DDD[2] + 8 digits -> Standard Landline)
  if (digits.length === 10) {
    return {
      valid: false,
      isLandline: true,
      error: `Telefone fixo detectado (${digits}). Disparos de WhatsApp são permitidos apenas para celulares.`,
    };
  }

  // Case 5: 9 digits (Local mobile without DDD)
  if (digits.length === 9) {
    return {
      valid: false,
      error: `Número sem DDD (${digits}). É obrigatório informar o DDD de 2 dígitos.`,
    };
  }

  // Case 6: 8 digits (Local landline without DDD)
  if (digits.length === 8) {
    return {
      valid: false,
      isLandline: true,
      error: `Telefone fixo local sem DDD (${digits}).`,
    };
  }

  return {
    valid: false,
    error: `Quantidade de dígitos inválida (${digits.length} dígitos: "${digits}").`,
  };
}

/**
 * Normalizes phone numbers by extracting only digits in valid E.164 mobile format if possible.
 * Backwards compatible helper.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  const result = validateAndFormatE164Mobile(raw);
  if (result.valid && result.e164) {
    return result.e164;
  }
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, "");
  return digits && digits.length >= 8 ? digits : null;
}

/**
 * Formats phone into a readable representation for UI display.
 */
export function formatDisplayPhone(phone?: string | null): string {
  if (!phone) return "—";
  const rawDigits = phone.replace(/\D+/g, "");
  if (!rawDigits) return phone;

  // Formato: 55 + DDD (2) + 9 dígitos (13 dígitos) -> +55 (XX) XXXXX-XXXX
  if (rawDigits.startsWith("55") && rawDigits.length === 13) {
    const ddd = rawDigits.slice(2, 4);
    const num = rawDigits.slice(4);
    return `+55 (${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
  }

  // Formato: 55 + DDD (2) + 8 dígitos (12 dígitos) -> +55 (XX) XXXX-XXXX
  if (rawDigits.startsWith("55") && rawDigits.length === 12) {
    const ddd = rawDigits.slice(2, 4);
    const num = rawDigits.slice(4);
    return `+55 (${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
  }

  // Formato: DDD (2) + 9 dígitos (11 dígitos) -> (XX) XXXXX-XXXX
  if (rawDigits.length === 11) {
    const ddd = rawDigits.slice(0, 2);
    const num = rawDigits.slice(2);
    return `(${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
  }

  // Formato: DDD (2) + 8 dígitos (10 dígitos) -> (XX) XXXX-XXXX
  if (rawDigits.length === 10) {
    const ddd = rawDigits.slice(0, 2);
    const num = rawDigits.slice(2);
    return `(${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
  }

  return phone;
}

/**
 * Checks if an incoming WhatsApp response is an Opt-Out / unsubscribe command
 * (e.g., "sair", "parar", "stop", "cancelar", "descadastrar", "não quero mais").
 */
export function isOptOutCommand(text: string | null | undefined): boolean {
  if (!text) return false;
  const clean = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove accents

  // Exact single word keywords
  const singleKeywords = new Set([
    "sair",
    "parar",
    "stop",
    "cancelar",
    "descadastrar",
    "desinscrever",
    "bloquear",
    "remover",
    "optout",
    "opt-out",
    "unsubscribe",
    "cancela",
  ]);

  if (singleKeywords.has(clean)) {
    return true;
  }

  // Common opt-out expressions
  const optOutPatterns = [
    /\bsair\b/i,
    /\bparar\b/i,
    /\bstop\b/i,
    /\bcancelar\b/i,
    /\bdescadastr(ar|e|o)?\b/i,
    /\bdesinscrev(er|a|o)?\b/i,
    /\bnao quero\b/i,
    /\bnao envie\b/i,
    /\bpare de enviar\b/i,
    /\bnao mandar\b/i,
    /\bnao mande\b/i,
    /\bfavor cancelar\b/i,
    /\bremova meu (numero|contato|telefone)\b/i,
  ];

  return optOutPatterns.some((pattern) => pattern.test(clean));
}
