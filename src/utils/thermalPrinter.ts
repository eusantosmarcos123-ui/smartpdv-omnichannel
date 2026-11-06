import type { Sale } from '../types';
import { formatCurrency } from './barcodeParser';

/**
 * Utilitário de Impressão Térmica ESC/POS (Elgin, Epson, Bematech, Daruma)
 * Produz tanto comandos hexadecimais nativos (ESC/POS) quanto layout gráfico de visualização de cupom.
 */
export const ESC_POS_COMMANDS = {
  INIT: '\x1B\x40',             // Inicializa impressora
  ALIGN_LEFT: '\x1B\x61\x00',   // Alinha à esquerda
  ALIGN_CENTER: '\x1B\x61\x01', // Centraliza
  ALIGN_RIGHT: '\x1B\x61\x02',  // Alinha à direita
  BOLD_ON: '\x1B\x45\x01',      // Negrito ligado
  BOLD_OFF: '\x1B\x45\x00',     // Negrito desligado
  CUT_FULL: '\x1D\x56\x00',     // Cortar papel total
  CUT_PARTIAL: '\x1D\x56\x01',  // Meio corte
  DRAWER_KICK: '\x1B\x70\x00\x19\xFA', // Pulso elétrico RJ11 para gaveta de dinheiro
  BEEP: '\x1B\x42\x02\x02',     // 2 bips curtos
};

/**
 * Gera o payload de cupom formatado em 48/40 colunas
 */
export function buildThermalReceiptText(sale: Sale, companyName = 'SUPERMERCADO MODELO'): string {
  const line = '------------------------------------------------';
  const header = [
    companyName.toUpperCase(),
    'CNPJ: 12.345.678/0001-90 - IE: 123.456.789',
    'AVENIDA PRINCIPAL, 1000 - CENTRO',
    line,
    `CUPOM NAO FISCAL - VENDA #${sale.sequenceId.toString().padStart(6, '0')}`,
    `DATA: ${new Date(sale.createdAt).toLocaleString('pt-BR')}  CAIXA: ${sale.cashierId}`,
    `OPERADOR: ${sale.operatorName}`,
    sale.customerCpf ? `CPF CLIENTE: ${sale.customerCpf}` : 'CONSUMIDOR NAO IDENTIFICADO',
    line,
    'ITEM  CODIGO     DESCRICAO          QTD   UN    TOTAL',
    line,
  ];

  const items = sale.items.map((it) => {
    const num = it.itemNumber.toString().padStart(3, '0');
    const desc = it.product.description.substring(0, 16).padEnd(16, ' ');
    const qty = it.quantity.toFixed(it.product.unit === 'KG' ? 3 : 0).padStart(5, ' ');
    const sub = formatCurrency(it.subtotalCents).padStart(10, ' ');
    return `${num}   ${desc} ${qty} ${it.product.unit} ${sub}`;
  });

  const totals = [
    line,
    `TOTAL BRUTO:                       ${formatCurrency(sale.totalCents + sale.discountCents).padStart(12, ' ')}`,
    sale.discountCents > 0 ? `DESCONTO:                         -${formatCurrency(sale.discountCents).padStart(12, ' ')}` : '',
    `TOTAL LIQUIDO:                     ${formatCurrency(sale.totalCents).padStart(12, ' ')}`,
    line,
    'FORMAS DE PAGAMENTO:',
    ...sale.payments.map((p) => ` ${p.method.padEnd(12, ' ')}                      ${formatCurrency(p.amountCents).padStart(12, ' ')}`),
    sale.changeCents > 0 ? ` TROCO:                             ${formatCurrency(sale.changeCents).padStart(12, ' ')}` : '',
    line,
    'OBRIGADO PELA PREFERENCIA! VOLTE SEMPRE!',
    'SmartPDV Omnichannel - Tecnologia de Alta Resiliencia',
    '\n\n\n',
  ].filter(Boolean);

  return [...header, ...items, ...totals].join('\n');
}
