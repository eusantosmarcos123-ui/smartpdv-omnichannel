import Dexie, { type Table } from 'dexie';
import type { Product, Sale } from '../types';

export interface CashierSession {
  id: string;
  tenantId: string;
  cashierId: string;
  operatorName: string;
  openedAt: string;
  closedAt?: string;
  initialAmountCents: number; // Fundo de troco inicial
  finalAmountCents?: number;
  status: 'OPEN' | 'CLOSED';
}

export interface CashMovement {
  id: string;
  sessionId: string;
  tenantId: string;
  type: 'SANGRIA' | 'SUPRIMENTO'; // Sangria (retirada de valor) ou Suprimento (reforço de troco)
  amountCents: number;
  reason: string;
  timestamp: string;
  synced: boolean;
}

export interface SyncLog {
  id: string;
  saleId: string;
  attempts: number;
  lastAttemptAt: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  errorMessage?: string;
}

export class SmartPDVDatabase extends Dexie {
  products!: Table<Product, string>;
  sales!: Table<Sale, string>;
  cashierSessions!: Table<CashierSession, string>;
  cashMovements!: Table<CashMovement, string>;
  syncLogs!: Table<SyncLog, string>;

  constructor() {
    super('SmartPDV_Retail_DB');

    // Esquema relacional com índices para consultas ultrarrápidas em turnos de alta carga
    this.version(1).stores({
      products: 'id, barcode, sku, category, priceCents, expirationDate',
      sales: 'id, sequenceId, tenantId, cashierId, synced, createdAt',
      cashierSessions: 'id, tenantId, cashierId, status, openedAt',
      cashMovements: 'id, sessionId, tenantId, type, synced, timestamp',
      syncLogs: 'id, saleId, status, lastAttemptAt',
    });
  }
}

export const db = new SmartPDVDatabase();

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    sku: '00101',
    barcode: '7891000100101',
    description: 'ARROZ TIO JOAO TIPO 1 5KG',
    category: 'Mercearia',
    unit: 'UN',
    priceCents: 2990,
    costCents: 2200,
    stock: 140,
  },
  {
    id: 'prod-2',
    sku: '00102',
    barcode: '7891000100102',
    description: 'FEIJAO CARIOCA CAMIL 1KG',
    category: 'Mercearia',
    unit: 'UN',
    priceCents: 849,
    costCents: 610,
    stock: 220,
  },
  {
    id: 'prod-3',
    sku: '00103',
    barcode: '7894900011517',
    description: 'REFRIGERANTE COCA-COLA 2L',
    category: 'Bebidas',
    unit: 'UN',
    priceCents: 1099,
    costCents: 850,
    stock: 85,
  },
  {
    id: 'prod-4',
    sku: '00123',
    barcode: '200123000000',
    description: 'ALCATRA BOVINA PECA KG',
    category: 'Acougue',
    unit: 'KG',
    priceCents: 4490,
    costCents: 3500,
    stock: 45,
    isWeighable: true,
  },
  {
    id: 'prod-5',
    sku: '00124',
    barcode: '200124000000',
    description: 'MACA FUJI SELECIONADA KG',
    category: 'Hortifruti',
    unit: 'KG',
    priceCents: 990,
    costCents: 620,
    stock: 90,
    isWeighable: true,
  },
  {
    id: 'prod-6',
    sku: '00105',
    barcode: '7891024132451',
    description: 'LEITE INTEGRAL PIRACANJUBA 1L',
    category: 'Laticinios',
    unit: 'UN',
    priceCents: 549,
    costCents: 420,
    stock: 180,
    expirationDate: '2026-11-02',
  },
  {
    id: 'prod-7',
    sku: '00106',
    barcode: '7891000315507',
    description: 'BISCOITO OREO ORIGINAL 90G',
    category: 'Mercearia',
    unit: 'UN',
    priceCents: 399,
    costCents: 250,
    stock: 200,
  },
  {
    id: 'prod-8',
    sku: '00107',
    barcode: '7896004000108',
    description: 'DETERGENTE YPE MACA 500ML',
    category: 'Limpeza',
    unit: 'UN',
    priceCents: 249,
    costCents: 160,
    stock: 320,
  }
];

/**
 * Seed inicial do banco de dados local
 */
export async function initDatabase(): Promise<void> {
  const count = await db.products.count();
  if (count === 0) {
    await db.products.bulkAdd(INITIAL_PRODUCTS);
  }

  // Verifica se já existe sessão de operador aberta
  const openSession = await db.cashierSessions.where({ status: 'OPEN' }).first();
  if (!openSession) {
    await db.cashierSessions.add({
      id: crypto.randomUUID(),
      tenantId: 'SUPERMERCADO-MODELO-01',
      cashierId: '04',
      operatorName: 'Marcos Vinicius',
      openedAt: new Date().toISOString(),
      initialAmountCents: 20000, // R$ 200,00 de fundo de troco
      status: 'OPEN',
    });
  }
}
