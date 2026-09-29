export interface InvoiceDocumentLine {
  LineNum?: number;
  Usage?: number | string | null;
  CFOPCode?: string | null;
  LineStatus?: string | null;
  ItemCode?: string | null;
  ItemDescription?: string | null;
}

export interface InvoiceListItem {
  DocEntry: number;
  DocNum: number;
  DocDate: string;
  CardCode: string;
  CardName: string;
  DocTotal: number;
  Series: number;
  DocumentStatus: string;
  Cancelled?: string;
  CancelStatus?: string;
  U_TX_NumeroNF?: string | null;
  SequenceSerial?: number | null;
  BPL_IDAssignedToInvoice?: number | null;
  BPLName?: string | null;
  SalesPerson?: {
    SalesEmployeeName?: string;
  } | null;
  DocumentLines?: InvoiceDocumentLine[];
  [key: string]: unknown;
}

export interface ContactInfo {
  CardCode: string;
  CardName: string;
  Phone1?: string | null;
  Phone2?: string | null;
  Cellular?: string | null;
  EmailAddress?: string | null;
  ContactPerson?: string | null;
  U_Subgrupo?: string | null;
  GroupCode?: number | string | null;
  U_RecebePesquisa?: string | number | null;
  ContactEmployees?: Array<{
    Name?: string | null;
    FirstName?: string | null;
    LastName?: string | null;
    MobilePhone?: string | null;
    Phone1?: string | null;
    Phone2?: string | null;
    E_Mail?: string | null;
  }>;
}

export interface SapSubgroup {
  Code: string;
  Name: string;
  Group?: string;
  groupCode: string;
  groupName: string;
  subgroup: string;
}

export interface SaleRow {
  docEntry: number;
  docNum: number;
  docDate: string;
  cardCode: string;
  cardName: string;
  docTotal: number;
  series: number;
  phone: string | null;
  contactName: string | null;
  email: string | null;
  salespersonName: string | null;
  bplId?: number | null;
  bplName?: string | null;
  recebePesquisa?: string | number | null;
  surveyStatus?: "sent" | "answered" | "failed" | "pending" | null;
}
