export type TemplateCategory = "inicial" | "intervalo" | "sair";

export interface MessageTemplateItem {
  id: string;
  name: string;
  body: string;
  is_default: boolean;
  type?: string;
  min_score?: number | null;
  max_score?: number | null;
  zenvia_template_id?: string | null;
  active?: boolean;
  channel?: string;
  created_at?: string;
}

export interface ScoreRange {
  min: number;
  max: number;
}

/**
 * Checks whether a template is active or inactive.
 */
export function isTemplateActive(tpl: {
  active?: boolean | null;
  type?: string | null;
}): boolean {
  if (tpl.active === false) return false;
  if (!tpl.type) return true;
  const clean = tpl.type.toLowerCase().trim();
  if (clean.startsWith("inactive:") || clean.startsWith("inativo:")) {
    return false;
  }
  return true;
}

/**
 * Returns the base type without inactive prefixes.
 */
export function getBaseType(type?: string | null): string {
  if (!type) return "inicial";
  return type.replace(/^(?:inactive|inativo):/i, "").trim();
}

/**
 * Normalizes any template type string to one of the 3 standard categories:
 * "inicial", "intervalo", "sair".
 */
export function getNormalizedCategory(type?: string | null): TemplateCategory {
  const base = getBaseType(type).toLowerCase();

  if (base === "inicial" || base === "pesquisa") {
    return "inicial";
  }

  if (
    base === "intervalo" ||
    base.startsWith("range:") ||
    base.startsWith("faixa:") ||
    base.startsWith("resposta_")
  ) {
    return "intervalo";
  }

  if (base === "sair" || base === "opt_out" || base === "resposta_sair") {
    return "sair";
  }

  return "inicial";
}

/**
 * Extracts the score range (min and max) from a template item, its name, or its type definition.
 */
export function getTemplateScoreRange(tpl: {
  name?: string | null;
  type?: string | null;
  min_score?: number | null;
  max_score?: number | null;
}): ScoreRange | null {
  if (tpl.min_score != null && tpl.max_score != null) {
    return { min: Number(tpl.min_score), max: Number(tpl.max_score) };
  }

  // 1. Check if name has score interval like "[1-3]", "[4-6]", "Notas 1 a 3", "1 a 3", "4 a 6", "1-3", "0 a 6"
  if (tpl.name) {
    const bracketMatch = tpl.name.match(/\[\s*(\d+)\s*(?:-|a|à|ate|até)\s*(\d+)\s*\]/i);
    if (bracketMatch) {
      return { min: Number(bracketMatch[1]), max: Number(bracketMatch[2]) };
    }
    const nameMatch = tpl.name.match(/(?:notas?|faixa|de)?\s*(\d+)\s*(?:-|a|à|ate|até)\s*(\d+)/i);
    if (nameMatch) {
      return { min: Number(nameMatch[1]), max: Number(nameMatch[2]) };
    }
    const singleMatch = tpl.name.match(/(?:nota)\s*(\d+)/i);
    if (singleMatch) {
      const s = Number(singleMatch[1]);
      return { min: s, max: s };
    }
  }

  const base = getBaseType(tpl.type);

  // Matches "range:1:3" or "faixa:1:2"
  const rangeMatch = base.match(/^(?:range|faixa):(\d+):(\d+)$/);
  if (rangeMatch) {
    return { min: Number(rangeMatch[1]), max: Number(rangeMatch[2]) };
  }

  // Legacy default categories
  if (base === "resposta_boa") {
    return { min: 9, max: 10 };
  }
  if (base === "resposta_media") {
    return { min: 7, max: 8 };
  }
  if (base === "resposta_ruim") {
    return { min: 0, max: 6 };
  }

  return null;
}

/**
 * Checks if a candidate range [min, max] overlaps with any existing ACTIVE interval templates.
 * Inactive templates are ignored so their intervals can be reused freely.
 */
export function findScoreOverlap(
  candidateMin: number,
  candidateMax: number,
  templates: MessageTemplateItem[],
  currentTemplateId?: string | null,
): { conflict: boolean; conflictingTemplate?: MessageTemplateItem } {
  const min = Math.min(candidateMin, candidateMax);
  const max = Math.max(candidateMin, candidateMax);

  for (const t of templates) {
    if (currentTemplateId && t.id === currentTemplateId) {
      continue;
    }

    // Ignore inactive templates from collision check
    if (!isTemplateActive(t)) {
      continue;
    }

    const category = getNormalizedCategory(t.type);
    if (category !== "intervalo") {
      continue;
    }

    const range = getTemplateScoreRange(t);
    if (!range) {
      continue;
    }

    // Overlap condition: max >= other.min && min <= other.max
    if (max >= range.min && min <= range.max) {
      return { conflict: true, conflictingTemplate: t };
    }
  }

  return { conflict: false };
}
