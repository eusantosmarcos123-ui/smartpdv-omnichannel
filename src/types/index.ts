// Types para o SmartPDV Omnichannel (Arquitetura Centavos / Inteiros)

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  description: string;
  category: string;
  unit: 'UN' | 'KG' | 'LT' | 'CX';
  priceCents: number; // Preço unitário em centavos (ex: R$ 4,50 = 450)
  costCents: number;
  stock: number;
  isWeighable?: boolean;
  minStock?: number;
  expirationDate?: string; // Para controle anti-desperdício
}

export interface CartItem {
  id: string; // UUID v4
  itemNumber: number;
  product: Product;
  quantity: number; // Suporta decimais para KG (ex: 1.455)
  unitPriceCents: number;
  discountCents: number;
  subtotalCents: number;
  timestamp: string;
}

export type PaymentMethod = 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO' | 'VALE' | 'FIADO';

export interface PaymentEntry {
  method: PaymentMethod;
  amountCents: number;
  pixTxId?: string;
  status: 'COMPLETED' | 'PENDING';
}

export interface Sale {
  id: string;
  sequenceId: number;
  tenantId: string;
  cashierId: string;
  operatorName: string;
  customerCpf?: string;
  customerName?: string;
  items: CartItem[];
  totalCents: number;
  discountCents: number;
  payments: PaymentEntry[];
  changeCents: number; // Troco
  synced: boolean;
  createdAt: string;
}

export interface HardwareStatus {
  printerStatus: 'CONNECTED' | 'DISCONNECTED' | 'PRINTING';
  scaleStatus: 'CONNECTED' | 'DISCONNECTED' | 'UNSTABLE';
  currentWeightKg: number;
  syncQueuePendingCount: number;
  isOnline: boolean;
}
