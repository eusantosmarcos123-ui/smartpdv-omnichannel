import type { Product, Sale } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    sku: '00101',
    barcode: '7891000100101',
    description: 'ARROZ TIO JOAO TIPO 1 5KG',
    category: 'Mercearia',
    unit: 'UN',
    priceCents: 2990, // R$ 29,90
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
    priceCents: 849, // R$ 8,49
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
    priceCents: 1099, // R$ 10,99
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
    priceCents: 4490, // R$ 44,90/kg
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
    priceCents: 990, // R$ 9,90/kg
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
    priceCents: 549, // R$ 5,49
    costCents: 420,
    stock: 180,
    expirationDate: '2026-11-02', // Módulo anti-desperdício
  },
];

const LOCAL_STORAGE_KEY_PRODUCTS = 'smartpdv_products_v1';
const LOCAL_STORAGE_KEY_SALES = 'smartpdv_sales_queue_v1';

export class OfflineStorageManager {
  static getProducts(): Product[] {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY_PRODUCTS);
      if (!data) {
        localStorage.setItem(LOCAL_STORAGE_KEY_PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
        return INITIAL_PRODUCTS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_PRODUCTS;
    }
  }

  static getSalesQueue(): Sale[] {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY_SALES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveSale(sale: Sale): void {
    const queue = this.getSalesQueue();
    queue.push(sale);
    localStorage.setItem(LOCAL_STORAGE_KEY_SALES, JSON.stringify(queue));

    // Abate de estoque local offline imediato
    const products = this.getProducts();
    sale.items.forEach((item) => {
      const idx = products.findIndex((p) => p.id === item.product.id);
      if (idx !== -1) {
        products[idx].stock = Math.max(0, products[idx].stock - item.quantity);
      }
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_PRODUCTS, JSON.stringify(products));
  }

  static markSynced(saleId: string): void {
    const queue = this.getSalesQueue();
    const updated = queue.map((s) => (s.id === saleId ? { ...s, synced: true } : s));
    localStorage.setItem(LOCAL_STORAGE_KEY_SALES, JSON.stringify(updated));
  }
}
