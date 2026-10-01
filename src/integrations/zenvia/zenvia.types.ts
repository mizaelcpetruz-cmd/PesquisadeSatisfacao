export interface SendWhatsAppTextOptions {
  to: string;
  text: string;
}

export interface SendWhatsAppTemplateOptions {
  to: string;
  templateId: string;
  fields: Record<string, string | number | null | undefined>;
}

export interface ZenviaResponse {
  id?: string;
  code?: string;
  message?: string;
}
