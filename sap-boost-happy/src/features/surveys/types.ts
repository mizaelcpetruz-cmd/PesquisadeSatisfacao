export interface SurveyRecord {
  id: string;
  created_at: string;
  sap_doc_entry: number;
  sap_doc_num: number | null;
  card_code: string | null;
  card_name: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  invoice_date: string | null;
  invoice_total: number | null;
  status: "pending" | "sent" | "sent_email" | "answered" | "failed";
  score: number | null;
  comment: string | null;
  error_message: string | null;
  salesperson_name: string | null;
  bpl_id?: number | null;
  bpl_name?: string | null;
  environment: "test" | "production";
  sent_at: string | null;
  answered_at: string | null;
  retry_count?: number;
}
