
export enum QuoteStatus {
  DRAFT = 'Rascunho',
  PENDING_APPROVAL = 'Pendente Aprovação',
  APPROVED = 'Aprovado',
  REJECTED = 'Rejeitado',
  SENT = 'Enviado ao Comercial'
}

export interface MaterialItem {
  id: string;
  supplier: string;
  description: string;
  value: number;
  valueWithMargin: number; // 50% margin usually
}

export interface Quote {
  id: string;
  commercial: string;
  date: string;
  client: string;
  nif: string;
  supplier: string;
  quoteNumber: string;
  materials: MaterialItem[];
  laborHours: number;
  laborDays: number;
  laborPeople: 1 | 2 | 3;
  distanceKm: number;
  kmRate: number;
  designHours: number;
  designRate: number;
  rounding: number;
  status: QuoteStatus;
  notes?: string;
  // Timestamps para relatório de fluxo
  createdAt: string;
  sentForApprovalAt?: string;
  approvedAt?: string;
  sentToSalesAt?: string;
}

export const LABOR_RATES = {
  hourly: { 1: 30, 2: 50, 3: 75 },
  daily: { 1: 200, 2: 350, 3: 425 }
};
