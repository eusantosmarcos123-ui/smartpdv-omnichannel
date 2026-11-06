import { db } from '../database/db';
import type { Sale, Product } from '../types';

export class DatabaseService {
  /**
   * Obtém todos os produtos cadastrados com seus estoques atualizados
   */
  static async getProducts(): Promise<Product[]> {
    return await db.products.toArray();
  }

  /**
   * Busca um produto por código de barras ou SKU
   */
  static async findProductByCode(code: string): Promise<Product | undefined> {
    return await db.products
      .where('barcode')
      .equals(code)
      .or('sku')
      .equals(code)
      .first();
  }

  /**
   * Registra uma venda localmente em uma transação atômica ACID indestrutível:
   * 1. Salva a Venda
   * 2. Abate do Estoque
   * 3. Registra na Fila de Sincronização
   */
  static async recordSale(sale: Sale): Promise<void> {
    await db.transaction('rw', [db.sales, db.products, db.syncLogs], async () => {
      // 1. Salvar venda
      await db.sales.add(sale);

      // 2. Abate atômico de estoque
      for (const item of sale.items) {
        const prod = await db.products.get(item.product.id);
        if (prod) {
          const newStock = Math.max(0, prod.stock - item.quantity);
          await db.products.update(prod.id, { stock: newStock });
        }
      }

      // 3. Fila de Sincronização Nuvem (Sync Queue)
      if (!sale.synced) {
        await db.syncLogs.add({
          id: crypto.randomUUID(),
          saleId: sale.id,
          attempts: 0,
          lastAttemptAt: new Date().toISOString(),
          status: 'PENDING',
        });
      }
    });
  }

  /**
   * Conta quantas vendas aguardam envio para a nuvem
   */
  static async getPendingSyncCount(): Promise<number> {
    return await db.sales.where({ synced: false }).count();
  }

  /**
   * Retorna a lista de todas as vendas locais
   */
  static async getAllSales(): Promise<Sale[]> {
    return await db.sales.reverse().sortBy('createdAt');
  }

  /**
   * Simula a sincronização em lote (batch idempotente) com a nuvem
   */
  static async syncPendingSales(): Promise<number> {
    const pendingSales = await db.sales.where({ synced: false }).toArray();
    if (pendingSales.length === 0) return 0;

    for (const sale of pendingSales) {
      await db.sales.update(sale.id, { synced: true });
      await db.syncLogs
        .where('saleId')
        .equals(sale.id)
        .modify({ status: 'SYNCED', lastAttemptAt: new Date().toISOString() });
    }

    return pendingSales.length;
  }
}
