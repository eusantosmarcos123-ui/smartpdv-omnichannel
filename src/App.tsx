import React, { useState, useEffect, useRef } from 'react';
import {
  Barcode,
  Printer,
  Scale,
  Wifi,
  WifiOff,
  Search,
  ShoppingCart,
  DollarSign,
  Clock,
  Trash2,
  QrCode,
  CreditCard,
  Banknote,
  Database,
  XCircle,
  RotateCcw
} from 'lucide-react';
import type { Product, CartItem, Sale, PaymentEntry } from './types';
import { initDatabase } from './database/db';
import { DatabaseService } from './services/databaseService';
import { parseBarcode, formatCurrency } from './utils/barcodeParser';
import { buildThermalReceiptText } from './utils/thermalPrinter';
import { PaymentModal } from './components/PaymentModal';
import { DatabasePanelModal } from './components/DatabasePanelModal';
import { AddProductModal } from './components/AddProductModal';

export const App: React.FC = () => {
  // Catálogo e Venda Atual
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [multiplier, setMultiplier] = useState<number>(1);
  const [customerCpf, setCustomerCpf] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Estados de Hardware e Offline Sync
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncQueueCount, setSyncQueueCount] = useState<number>(0);
  const [scaleWeight] = useState<number>(0.000);
  const [lastPrintedReceipt, setLastPrintedReceipt] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString('pt-BR'));

  // Modais e UI
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [isProductSearchOpen, setIsProductSearchOpen] = useState<boolean>(false);
  const [isDatabasePanelOpen, setIsDatabasePanelOpen] = useState<boolean>(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Relógio do HUD
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('pt-BR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Inicialização do Banco de Dados Relacional e Monitor de Rede
  useEffect(() => {
    const bootstrap = async () => {
      await initDatabase();
      const localProducts = await DatabaseService.getProducts();
      setProducts(localProducts);
      const pending = await DatabaseService.getPendingSyncCount();
      setSyncQueueCount(pending);
    };

    bootstrap();

    const handleOnline = async () => {
      setIsOnline(true);
      const synced = await DatabaseService.syncPendingSales();
      if (synced > 0) {
        setSyncQueueCount(0);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Auto-foco ininterrupto no input de código de barras
    const focusTimer = setInterval(() => {
      if (!isPaymentOpen && !isReceiptModalOpen && !isProductSearchOpen && !isDatabasePanelOpen) {
        barcodeInputRef.current?.focus();
      }
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(focusTimer);
    };
  }, [isPaymentOpen, isReceiptModalOpen, isProductSearchOpen, isDatabasePanelOpen]);

  // Totais da Compra
  const totalCents = cart.reduce((acc, item) => acc + item.subtotalCents, 0);
  const totalItemsCount = cart.reduce((acc, item) => acc + (item.product.unit === 'KG' ? 1 : item.quantity), 0);
  const lastItem = cart[cart.length - 1];

  // Adição de Item no Carrinho
  const handleAddItem = (codeOrBarcode: string) => {
    if (!codeOrBarcode.trim()) return;

    const parsed = parseBarcode(codeOrBarcode, products);
    const foundProduct = products.find(
      (p) => p.barcode === parsed.barcode || p.sku === parsed.skuOrCode
    );

    if (!foundProduct) {
      alert(`Produto não cadastrado para o código: ${codeOrBarcode}`);
      setBarcodeInput('');
      return;
    }

    const qty = parsed.quantity !== 1 ? (parsed.quantity ?? 1) : multiplier;
    const unitPriceCents = foundProduct.priceCents;
    const subtotalCents = Math.round(qty * unitPriceCents);

    const newItem: CartItem = {
      id: crypto.randomUUID(),
      itemNumber: cart.length + 1,
      product: foundProduct,
      quantity: qty,
      unitPriceCents,
      discountCents: 0,
      subtotalCents,
      timestamp: new Date().toISOString(),
    };

    setCart((prev) => [...prev, newItem]);
    setSelectedItemId(newItem.id);
    setBarcodeInput('');
    setMultiplier(1);
  };

  // Limpar Todos os Itens do Carrinho
  const handleClearCart = () => {
    if (cart.length === 0) return;
    const confirmClear = confirm('Deseja limpar todos os itens bipados do ticket atual?');
    if (confirmClear) {
      setCart([]);
      setSelectedItemId(null);
    }
  };

  // Encerrar / Cancelar Compra
  const handleCancelSale = () => {
    if (cart.length === 0) {
      alert('Não há compra ativa para encerrar.');
      return;
    }
    const confirmCancel = confirm('O cliente desistiu da compra? Deseja realmente encerrar e descartar este atendimento?');
    if (confirmCancel) {
      setCart([]);
      setSelectedItemId(null);
      setCustomerCpf('');
      setBarcodeInput('');
      setMultiplier(1);
    }
  };

  // Gerenciamento de Atalhos Globais
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setIsProductSearchOpen(true);
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (cart.length > 0) setIsPaymentOpen(true);
      } else if (e.key === 'F7') {
        e.preventDefault();
        const cpf = prompt('Identificação do Cliente (CPF ou WhatsApp para Fidelidade):');
        if (cpf) setCustomerCpf(cpf.trim());
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) {
          const itemToCancel = selectedItemId
            ? cart.find((i) => i.id === selectedItemId)
            : lastItem;
          if (itemToCancel) {
            const confirmCancel = confirm(`Cancelar item #${itemToCancel.itemNumber} (${itemToCancel.product.description})?`);
            if (confirmCancel) {
              setCart((prev) => prev.filter((i) => i.id !== itemToCancel.id));
            }
          }
        }
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleCancelSale();
      } else if (e.key === 'F10') {
        e.preventDefault();
        setIsDatabasePanelOpen(true);
      } else if (e.key === 'F12') {
        e.preventDefault();
        alert('Comando ESC/POS enviado: Pulso elétrico RJ11 (Abertura de Gaveta de Dinheiro).');
      } else if (e.key === '*' && barcodeInput.length > 0 && !isNaN(Number(barcodeInput))) {
        e.preventDefault();
        setMultiplier(parseFloat(barcodeInput));
        setBarcodeInput('');
      } else if (e.key === 'Escape') {
        if (isProductSearchOpen) setIsProductSearchOpen(false);
        if (isReceiptModalOpen) setIsReceiptModalOpen(false);
        if (isDatabasePanelOpen) setIsDatabasePanelOpen(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cart, lastItem, selectedItemId, barcodeInput, isProductSearchOpen, isReceiptModalOpen, isDatabasePanelOpen]);

  // Finalização da Venda
  const handleFinishSale = async (payments: PaymentEntry[], changeCents: number) => {
    const allSales = await DatabaseService.getAllSales();
    const newSale: Sale = {
      id: crypto.randomUUID(),
      sequenceId: allSales.length + 1,
      tenantId: 'SUPERMERCADO-MODELO-01',
      cashierId: '04',
      operatorName: 'Marcos Vinicius',
      customerCpf: customerCpf || undefined,
      items: cart,
      totalCents,
      discountCents: 0,
      payments,
      changeCents,
      synced: isOnline,
      createdAt: new Date().toISOString(),
    };

    await DatabaseService.recordSale(newSale);
    const updatedProducts = await DatabaseService.getProducts();
    setProducts(updatedProducts);

    const receiptText = buildThermalReceiptText(newSale);
    setLastPrintedReceipt(receiptText);

    setCart([]);
    setCustomerCpf('');
    setIsPaymentOpen(false);
    setIsReceiptModalOpen(true);
    
    const pendingCount = await DatabaseService.getPendingSyncCount();
    setSyncQueueCount(pendingCount);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070A0E] text-gray-100 font-mono select-none overflow-hidden">
      
      {/* 1. APEX TELEMETRY HUD (Top Banner) */}
      <header className="h-13 bg-[#0B0F14] border-b border-[#1A2332] px-4 flex items-center justify-between text-xs">
        {/* Lane ID & Operator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-black text-sm tracking-widest text-emerald-400">APEX TERMINAL</span>
            <span className="px-1.5 py-0.5 rounded bg-[#1A2332] border border-[#26354A] text-[10px] font-bold text-gray-300">
              LANE 04 EXPRESS
            </span>
          </div>
          <div className="h-4 w-px bg-[#1A2332]"></div>
          <div className="text-gray-400">
            OP: <strong className="text-gray-200">MARCOS VINICIUS</strong> <span className="text-gray-600">[#9042]</span>
          </div>
        </div>

        {/* Telemetria de Periféricos de Hardware */}
        <div className="flex items-center gap-2">
          {/* Botão de Atalho para o Banco de Dados */}
          <button
            onClick={() => setIsDatabasePanelOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1A2332] hover:bg-emerald-950/60 border border-[#26354A] hover:border-emerald-500/50 text-emerald-400 font-bold transition"
            title="Abrir Painel do Banco de Dados [F10]"
          >
            <Database size={13} />
            <span className="text-[10px]">BANCO DE DADOS [F10]</span>
          </button>

          {/* Balança de Mesa */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0E1520] border border-[#1E293B] text-cyan-400 font-bold">
            <Scale size={13} className="text-cyan-400" />
            <span className="text-[10px] text-gray-400 uppercase">Balança:</span>
            <span className="tabular-numbers text-cyan-300">{scaleWeight.toFixed(3)} kg</span>
          </div>

          {/* Impressora ESC/POS */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0E1520] border border-[#1E293B] text-emerald-400 font-bold">
            <Printer size={13} />
            <span className="text-[10px] text-gray-400 uppercase">ESC/POS:</span>
            <span>ONLINE</span>
          </div>

          {/* Status de Rede & Sync Queue */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-bold ${
            isOnline 
              ? 'bg-[#0E2018] border-emerald-500/30 text-emerald-400' 
              : 'bg-[#261010] border-red-500/30 text-red-400'
          }`}>
            {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            <span>{isOnline ? 'SYNCD (4ms)' : 'OFFLINE'}</span>
            {syncQueueCount > 0 && (
              <span className="ml-1 px-1 rounded bg-amber-400 text-black text-[9px] font-black">
                {syncQueueCount} FILA
              </span>
            )}
          </div>

          {/* Relógio em Tempo Real */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1A2332] border border-[#26354A] text-gray-300 tabular-numbers">
            <Clock size={12} className="text-gray-400" />
            <span>{currentTime}</span>
          </div>
        </div>
      </header>

      {/* 2. ÁREA DE TRABALHO TÁTICA (3 COLUNAS STITCH HUD) */}
      <main className="flex-1 flex overflow-hidden p-2 gap-2">
        
        {/* COLUNA 1: LEITOR ÓPTICO & CATÁLOGO RÁPIDO PLU (28% Largura) */}
        <section className="w-[28%] flex flex-col gap-2">
          
          {/* Scanner Reticle Viewport */}
          <div className="bg-[#0B0F14] border border-[#1A2332] rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Barcode size={15} /> Leitor Óptico CMOS
              </span>
              <span className="text-emerald-400 animate-pulse text-[10px]">● ATIVO 60 FPS</span>
            </div>

            {/* Input com Mira Laser */}
            <div className="relative">
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItem(barcodeInput);
                  }
                }}
                placeholder="Bipar EAN ou PLU..."
                className="w-full bg-[#070A0E] border-2 border-emerald-500/60 focus:border-emerald-400 rounded px-3 py-2.5 text-base font-mono text-emerald-300 placeholder:text-gray-600 focus:outline-none shadow-[0_0_12px_rgba(16,185,129,0.15)]"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {multiplier > 1 && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500 text-black text-[10px] font-black">
                    {multiplier}x
                  </span>
                )}
                <span className="text-[10px] text-gray-500 bg-[#1A2332] px-1 rounded border border-[#26354A]">
                  ↵ ENTER
                </span>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 leading-tight">
              Digite <kbd className="text-amber-400 font-bold">3*</kbd> para multiplicar ou bipe etiqueta de balança <kbd className="text-cyan-400">2xxxxx</kbd>
            </p>
          </div>

          {/* Quick-Pick PLU Matrix (Hortifruti / Padaria / Açougue) */}
          <div className="flex-1 bg-[#0B0F14] border border-[#1A2332] rounded-lg p-2.5 flex flex-col gap-2 overflow-hidden">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
              <span>Atalhos Rápidos PLU</span>
              <button
                onClick={() => setIsAddProductOpen(true)}
                className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition"
                title="Cadastrar Novo Produto"
              >
                + CADASTRAR ITEM
              </button>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-1.5 overflow-y-auto">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleAddItem(p.barcode)}
                  className="bg-[#121820] hover:bg-[#1A2332] border border-[#1E293B] hover:border-emerald-500/50 p-2 rounded flex flex-col justify-between text-left transition active:scale-[0.98]"
                >
                  <span className="text-[11px] font-sans font-bold text-gray-200 line-clamp-2 leading-tight">
                    {p.description}
                  </span>
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-gray-400">
                      {p.unit}
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {formatCurrency(p.priceCents)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </section>

        {/* COLUNA 2: TICKET JOURNAL EM ALTA DENSIDADE (44% Largura) */}
        <section className="w-[44%] flex flex-col bg-[#0B0F14] border border-[#1A2332] rounded-lg overflow-hidden">
          
          {/* Header da Tabela */}
          <div className="px-3 py-2 bg-[#121820] border-b border-[#1A2332] flex items-center justify-between text-[11px]">
            <span className="font-bold text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
              <ShoppingCart size={14} className="text-emerald-400" />
              Ticket de Compras ({cart.length} itens)
            </span>
            <div className="flex items-center gap-2 text-gray-400 text-[10px]">
              <span>VOLUMES: <strong className="text-white">{totalItemsCount}</strong></span>
              {customerCpf && (
                <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  CPF: {customerCpf}
                </span>
              )}
            </div>
          </div>

          {/* Tabela de Linhas do Ticket */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-[#070A0E] text-gray-500 uppercase sticky top-0 border-b border-[#1A2332]">
                <tr>
                  <th className="py-2 px-2.5 w-10 text-center">#</th>
                  <th className="py-2 px-2">Código/EAN</th>
                  <th className="py-2 px-2">Descrição</th>
                  <th className="py-2 px-2 text-right w-16">Qtd</th>
                  <th className="py-2 px-1 text-center w-10">Un</th>
                  <th className="py-2 px-2 text-right w-20">Unit</th>
                  <th className="py-2 px-3 text-right w-24">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2332]/50">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-28 text-center text-gray-600 font-sans">
                      <ShoppingCart size={40} className="mx-auto mb-2 opacity-20" />
                      Caixa Livre. Bipe o código ou use a matriz PLU.
                    </td>
                  </tr>
                ) : (
                  cart.map((item, idx) => {
                    const isSelected = selectedItemId === item.id;
                    const isLatest = idx === cart.length - 1;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? 'bg-[#1A2332] border-l-2 border-emerald-400'
                            : isLatest
                            ? 'bg-emerald-950/20'
                            : 'hover:bg-[#121820]'
                        }`}
                      >
                        <td className="py-2 px-2.5 text-center text-gray-500 font-mono">
                          {item.itemNumber.toString().padStart(2, '0')}
                        </td>
                        <td className="py-2 px-2 text-gray-400 font-mono text-[10px]">
                          {item.product.barcode}
                        </td>
                        <td className="py-2 px-2 font-sans font-medium text-gray-100 truncate max-w-[170px]">
                          {item.product.description}
                        </td>
                        <td className="py-2 px-2 text-right text-amber-300 font-bold tabular-numbers">
                          {item.quantity.toFixed(item.product.unit === 'KG' ? 3 : 0)}
                        </td>
                        <td className="py-2 px-1 text-center text-gray-500 text-[10px]">
                          {item.product.unit}
                        </td>
                        <td className="py-2 px-2 text-right text-gray-400 tabular-numbers">
                          {formatCurrency(item.unitPriceCents)}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-400 font-bold tabular-numbers">
                          {formatCurrency(item.subtotalCents)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Barra de Ações Rápidas no Item Selecionado e Ticket */}
          <div className="p-2 bg-[#070A0E] border-t border-[#1A2332] flex items-center justify-between text-[11px] gap-2">
            <span className="text-gray-500 text-[10px] truncate max-w-[150px]">
              Item: <strong className="text-gray-300">{cart.find((i) => i.id === selectedItemId)?.product.description || 'Nenhum'}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              {/* Botão de Cancelar Item [F8] */}
              <button
                onClick={() => {
                  if (selectedItemId) {
                    setCart((prev) => prev.filter((i) => i.id !== selectedItemId));
                  } else if (lastItem) {
                    setCart((prev) => prev.slice(0, -1));
                  }
                }}
                disabled={cart.length === 0}
                className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 disabled:opacity-30 border border-red-800 text-red-400 rounded text-[10px] font-bold flex items-center gap-1 transition"
                title="Cancelar Item Selecionado [F8]"
              >
                <Trash2 size={12} /> [F8] Cancelar Item
              </button>

              {/* Botão de Limpar Tudo */}
              <button
                onClick={handleClearCart}
                disabled={cart.length === 0}
                className="px-2.5 py-1 bg-[#1A2332] hover:bg-amber-950/40 disabled:opacity-30 border border-[#26354A] hover:border-amber-600/50 text-amber-400 rounded text-[10px] font-bold flex items-center gap-1 transition"
                title="Remover todos os itens bipados do ticket atual"
              >
                <RotateCcw size={12} /> Limpar Tudo
              </button>

              {/* Botão de Encerrar Compra / Desistência [F9] */}
              <button
                onClick={handleCancelSale}
                disabled={cart.length === 0}
                className="px-2.5 py-1 bg-[#261010] hover:bg-red-950 disabled:opacity-30 border border-red-700/60 hover:border-red-500 text-red-300 rounded text-[10px] font-bold flex items-center gap-1 transition"
                title="Encerrar / Cancelar Compra por desistência do cliente [F9]"
              >
                <XCircle size={12} /> [F9] Encerrar Compra
              </button>
            </div>
          </div>

        </section>

        {/* COLUNA 3: TOTALIZADOR GIGANTE & TECLADO TÁTICO DE PAGAMENTO (28% Largura) */}
        <section className="w-[28%] flex flex-col gap-2">
          
          {/* Card de Último Item Bipado com Foto/Preview */}
          <div className="bg-[#0B0F14] border border-[#1A2332] rounded-lg p-3">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Último Item Bipado</span>
            {lastItem ? (
              <div className="mt-1">
                <div className="text-sm font-sans font-bold text-white truncate">
                  {lastItem.product.description}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs font-mono">
                  <span className="text-gray-400">
                    {lastItem.quantity} {lastItem.product.unit} × {formatCurrency(lastItem.unitPriceCents)}
                  </span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {formatCurrency(lastItem.subtotalCents)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-600 mt-1">Aguardando registro de itens...</div>
            )}
          </div>

          {/* TOTALIZADOR GIGANTE HUD */}
          <div className="bg-gradient-to-br from-[#064E3B] via-[#022C22] to-[#0B0F14] border-2 border-emerald-500/50 rounded-xl p-4 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-300">
                  TOTAL A PAGAR
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-600 font-bold">
                  BRL
                </span>
              </div>
              <div className="text-4xl font-black text-emerald-300 tracking-tight tabular-numbers mt-2 drop-shadow-md">
                {formatCurrency(totalCents)}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-600/30 flex items-center justify-between text-xs text-emerald-200/80">
              <span>Subtotal: {formatCurrency(totalCents)}</span>
              <span>Desconto: R$ 0,00</span>
            </div>
          </div>

          {/* Tactical Tender Matrix (Formas de Pagamento Rápidas) */}
          <div className="flex-1 bg-[#0B0F14] border border-[#1A2332] rounded-lg p-2.5 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
              Recebimento / Tenders
            </span>

            <div className="grid grid-cols-2 gap-1.5 my-2">
              <button
                onClick={() => {
                  if (cart.length > 0) setIsPaymentOpen(true);
                }}
                disabled={cart.length === 0}
                className="p-2.5 bg-[#121820] hover:bg-[#1A2332] disabled:opacity-40 border border-[#1E293B] rounded flex flex-col items-center justify-center gap-1 transition"
              >
                <Banknote size={18} className="text-amber-400" />
                <span className="text-[11px] font-bold text-gray-200">[F5] Dinheiro</span>
              </button>

              <button
                onClick={() => {
                  if (cart.length > 0) setIsPaymentOpen(true);
                }}
                disabled={cart.length === 0}
                className="p-2.5 bg-[#121820] hover:bg-[#1A2332] disabled:opacity-40 border border-[#1E293B] rounded flex flex-col items-center justify-center gap-1 transition"
              >
                <QrCode size={18} className="text-cyan-400" />
                <span className="text-[11px] font-bold text-gray-200">Pix Instantâneo</span>
              </button>

              <button
                onClick={() => {
                  if (cart.length > 0) setIsPaymentOpen(true);
                }}
                disabled={cart.length === 0}
                className="p-2.5 bg-[#121820] hover:bg-[#1A2332] disabled:opacity-40 border border-[#1E293B] rounded flex flex-col items-center justify-center gap-1 transition"
              >
                <CreditCard size={18} className="text-emerald-400" />
                <span className="text-[11px] font-bold text-gray-200">Cartão Débito</span>
              </button>

              <button
                onClick={() => {
                  if (cart.length > 0) setIsPaymentOpen(true);
                }}
                disabled={cart.length === 0}
                className="p-2.5 bg-[#121820] hover:bg-[#1A2332] disabled:opacity-40 border border-[#1E293B] rounded flex flex-col items-center justify-center gap-1 transition"
              >
                <CreditCard size={18} className="text-purple-400" />
                <span className="text-[11px] font-bold text-gray-200">Cartão Crédito</span>
              </button>
            </div>

            {/* Botão de Conclusão Instantânea */}
            <button
              onClick={() => {
                if (cart.length > 0) setIsPaymentOpen(true);
              }}
              disabled={cart.length === 0}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 text-black font-black text-sm uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98]"
            >
              <DollarSign size={20} />
              [F5] Concluir Venda
            </button>
          </div>

        </section>
      </main>

      {/* 3. RODAPÉ FIXO DE TECLAS DE ATALHO (HUD HOTKEYS) */}
      <footer className="h-10 bg-[#0B0F14] border-t border-[#1A2332] px-3 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2 py-0.5 rounded bg-[#1A2332] border border-[#26354A] text-gray-300">
            <strong className="text-emerald-400">F1</strong> BUSCA
          </span>
          <span className="px-2 py-0.5 rounded bg-[#1A2332] border border-[#26354A] text-gray-300">
            <strong className="text-amber-400">*</strong> MULTIPLICAR
          </span>
          <span className="px-2 py-0.5 rounded bg-[#1A2332] border border-[#26354A] text-gray-300">
            <strong className="text-emerald-400">F5</strong> PAGAMENTO
          </span>
          <span className="px-2 py-0.5 rounded bg-[#1A2332] border border-[#26354A] text-gray-300">
            <strong className="text-cyan-400">F7</strong> CPF/CLUBE
          </span>
          <span className="px-2 py-0.5 rounded bg-[#1A2332] border border-[#26354A] text-gray-300">
            <strong className="text-red-400">F8</strong> CANCELA ITEM
          </span>
          <span className="px-2 py-0.5 rounded bg-[#1A2332] border border-[#26354A] text-gray-300">
            <strong className="text-red-400">F9</strong> CANCELA VENDA
          </span>
          <span className="px-2 py-0.5 rounded bg-[#1A2332] border border-[#26354A] text-gray-300">
            <strong className="text-emerald-400">F10</strong> BANCO DE DADOS
          </span>
          <span className="px-2 py-0.5 rounded bg-[#1A2332] border border-[#26354A] text-gray-300">
            <strong className="text-yellow-400">F12</strong> GAVETA RJ11
          </span>
          <span className="px-2 py-0.5 rounded bg-[#1A2332] border border-[#26354A] text-gray-300">
            <strong className="text-gray-400">ESC</strong> VOLTAR
          </span>
        </div>
        <div className="text-gray-600 font-mono text-[10px]">
          APEX INDUSTRIAL HUD v2.0 • STITCH ENGINE
        </div>
      </footer>

      {/* Modal de Painel do Banco de Dados */}
      <DatabasePanelModal
        isOpen={isDatabasePanelOpen}
        onClose={() => setIsDatabasePanelOpen(false)}
        onDataChanged={async () => {
          const updated = await DatabaseService.getProducts();
          setProducts(updated);
          const pending = await DatabaseService.getPendingSyncCount();
          setSyncQueueCount(pending);
        }}
      />

      {/* Modal para Cadastro Rápido de Produto */}
      <AddProductModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        onProductAdded={async () => {
          const updated = await DatabaseService.getProducts();
          setProducts(updated);
        }}
      />

      {/* Modal de Pagamento */}
      <PaymentModal
        isOpen={isPaymentOpen}
        totalCents={totalCents}
        onClose={() => setIsPaymentOpen(false)}
        onFinishSale={handleFinishSale}
      />

      {/* Modal de Visualização de Cupom ESC/POS */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0B0F14] border border-[#1A2332] rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between text-white border-b border-[#1A2332] pb-2">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <Printer className="text-emerald-400" size={18} />
                Cupom Emitido (ESC/POS 48 Colunas)
              </h3>
              <button onClick={() => setIsReceiptModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <pre className="bg-white text-black p-4 rounded text-[11px] font-mono leading-tight whitespace-pre-wrap max-h-96 overflow-y-auto shadow-inner">
              {lastPrintedReceipt}
            </pre>
            <button
              onClick={() => setIsReceiptModalOpen(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-sm transition"
            >
              [ENTER / ESC] Novo Atendimento
            </button>
          </div>
        </div>
      )}

      {/* Modal de Busca Rápida de Produtos (F1) */}
      {isProductSearchOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0B0F14] border border-[#1A2332] rounded-xl max-w-2xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between text-white border-b border-[#1A2332] pb-2">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <Search className="text-emerald-400" size={18} />
                Consulta de Produtos & Preços [F1]
              </h3>
              <button onClick={() => setIsProductSearchOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite a descrição ou código..."
              className="w-full bg-[#070A0E] border border-[#1A2332] rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
            <div className="max-h-60 overflow-y-auto divide-y divide-[#1A2332]">
              {products
                .filter((p) => p.description.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm))
                .map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      handleAddItem(p.barcode);
                      setIsProductSearchOpen(false);
                    }}
                    className="p-3 hover:bg-[#121820] cursor-pointer flex justify-between items-center transition"
                  >
                    <div>
                      <div className="font-bold text-white text-sm font-sans">{p.description}</div>
                      <div className="text-xs text-gray-500 font-mono">EAN: {p.barcode} | Estoque: {p.stock} {p.unit}</div>
                    </div>
                    <div className="text-emerald-400 font-bold font-mono text-base">
                      {formatCurrency(p.priceCents)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
