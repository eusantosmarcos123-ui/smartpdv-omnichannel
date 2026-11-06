import type { Product } from '../types';

export interface BarcodeParseResult {
  type: 'STANDARD' | 'WEIGHABLE_WEIGHT' | 'WEIGHABLE_PRICE';
  barcode: string;
  skuOrCode: string;
  quantity?: number;
  totalPriceCents?: number;
}

/**
 * Decodifica códigos de barras padrão EAN-13 e etiquetas de balança (açougue / hortifruti / padaria).
 * Padrão brasileiro de balança de açougue:
 * Começa com '2', seguido por 5 dígitos do código/item, seguido por 5 dígitos do peso/valor e 1 DV.
 * Exemplo: 2 00123 01500 4
 *  - 2 = Prefixo balança
 *  - 00123 = Código do produto no sistema
 *  - 01500 = 1.500 kg (ou R$ 15,00)
 */
export function parseBarcode(input: string, productsCatalog: Product[]): BarcodeParseResult {
  const cleanInput = input.trim();

  // Verifica se é padrão de balança (começa com 2 e possui 13 dígitos numéricos)
  if (/^2\d{12}$/.test(cleanInput)) {
    const itemCode = cleanInput.substring(1, 6);
    const valuePart = parseInt(cleanInput.substring(6, 11), 10);

    // Encontra produto associado pelo SKU ou código de balança
    const product = productsCatalog.find(
      (p) => p.sku === itemCode || p.barcode === cleanInput || p.barcode.includes(itemCode)
    );

    // Se a balança for configurada por peso (kg com 3 casas decimais: 01500 = 1.500 kg)
    const weightKg = valuePart / 1000;

    return {
      type: 'WEIGHABLE_WEIGHT',
      barcode: cleanInput,
      skuOrCode: itemCode,
      quantity: weightKg,
      totalPriceCents: product ? Math.round(weightKg * product.priceCents) : undefined,
    };
  }

  // Código EAN padrão de indústria (ex: 789...)
  return {
    type: 'STANDARD',
    barcode: cleanInput,
    skuOrCode: cleanInput,
    quantity: 1,
  };
}

/**
 * Utilitário para formatação monetária padrão BRL a partir de inteiros (centavos)
 */
export function formatCurrency(cents: number): string {
  const val = (cents / 100).toFixed(2);
  return `R$ ${val.replace('.', ',')}`;
}
