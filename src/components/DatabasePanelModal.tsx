import React, { useState, useEffect } from 'react';
import { Database, Table, X, Shield, Trash2, RotateCcw, Plus, Edit2 } from 'lucide-react';
import { db, INITIAL_PRODUCTS } from '../database/db';
import type { Product, Sale } from '../types';
import { formatCurrency } from '../utils/barcodeParser';
import { AddProductModal } from './AddProductModal';
import { EditProductModal } from './EditProductModal';

interface DatabasePanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

export const DatabasePanelModal: React.FC<DatabasePanelModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'SALES' | 'SESSIONS' | 'SYNCLOGS'>('PRODUCTS');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [isAddProductOpen, setIsAddProductOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const loadData = async () => {
    try {
      const p = await db.products.toArray();
      const s = await db.sales.reverse().sortBy('createdAt');
      const sess = await db.cashierSessions.toArray();
      const sl = await db.syncLogs.toArray();
      setProducts(p);
      setSales(s);
      setSessions(sess);
      setSyncLogs(sl);
    } catch (err) {
      console.error('Erro ao ler dados do IndexedDB:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Apagar Item Individual
  const handleDeleteProduct = async (id: string, description: string) => {
    if (confirm(`Deseja realmente apagar o produto "${description}" do banco de dados?`)) {
      await db.products.delete(id);
      await loadData();
      onDataChanged?.();
    }
  };

  const handleDeleteSale = async (id: string, sequenceId: number) => {
    if (confirm(`Deseja realmente apagar a Venda #${sequenceId.toString().padStart(6, '0')} do banco de dados?`)) {
      await db.sales.delete(id);
      await loadData();
      onDataChanged?.();
    }
  };

  // Limpar Tabela Inteira Ativa
  const handleClearCurrentTable = async () => {
    let tableName = '';
    if (activeTab === 'PRODUCTS') tableName = 'Produtos';
    if (activeTab === 'SALES') tableName = 'Vendas';
    if (activeTab === 'SESSIONS') tableName = 'Sessões de Caixa';
    if (activeTab === 'SYNCLOGS') tableName = 'Fila de Sincronização';

    if (confirm(`ATENÇÃO: Deseja apagar TODOS os registros da tabela de ${tableName}?`)) {
      if (activeTab === 'PRODUCTS') await db.products.clear();
      if (activeTab === 'SALES') await db.sales.clear();
      if (activeTab === 'SESSIONS') await db.cashierSessions.clear();
      if (activeTab === 'SYNCLOGS') await db.syncLogs.clear();
      await loadData();
      onDataChanged?.();
    }
  };

  // Restaurar Catálogo Padrão (Seed)
  const handleResetCatalog = async () => {
    if (confirm('Deseja restaurar o catálogo de produtos original de teste?')) {
      await db.products.clear();
      await db.products.bulkAdd(INITIAL_PRODUCTS);
      await loadData();
      onDataChanged?.();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#0B0F14] border-2 border-[#1E293B] rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden text-gray-100 font-mono animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header do Painel */}
        <div className="px-6 py-4 bg-[#121820] border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-emerald-950/60 border border-emerald-600/40 text-emerald-400">
              <Database size={22} />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                PAINEL DO BANCO DE DADOS LOCAL
                <span className="text-[10px] bg-[#1A2332] text-cyan-400 border border-[#26354A] px-2 py-0.5 rounded font-bold">
                  INDEXEDDB / DEXIE
                </span>
              </h2>
              <p className="text-xs text-gray-400 font-sans">
                Inspeção ao vivo de tabelas relacionais, persistência offline e registros de transações
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Botão de Adicionar Produto */}
            <button
              onClick={() => setIsAddProductOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition"
              title="Cadastrar Novo Produto"
            >
              <Plus size={14} />
              Adicionar Item
            </button>

            {/* Botão de Limpar Tabela */}
            <button
              onClick={handleClearCurrentTable}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-400 text-xs font-bold transition"
              title="Apagar todos os dados desta tabela"
            >
              <Trash2 size={14} />
              Apagar Tabela
            </button>

            {/* Botão Restaurar Produtos */}
            {activeTab === 'PRODUCTS' && (
              <button
                onClick={handleResetCatalog}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1A2332] hover:bg-[#26354A] border border-[#334155] text-emerald-400 text-xs font-bold transition"
                title="Restaurar Catálogo Original"
              >
                <RotateCcw size={14} />
                Restaurar Padrão
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1A2332] rounded text-gray-400 hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Barra de Abas (Tabelas) */}
        <div className="px-6 py-2 bg-[#070A0E] border-b border-[#1E293B] flex gap-2 text-xs">
          {[
            { id: 'PRODUCTS', label: `Produtos (${products.length})`, count: products.length },
            { id: 'SALES', label: `Vendas (${sales.length})`, count: sales.length },
            { id: 'SESSIONS', label: `Sessões (${sessions.length})`, count: sessions.length },
            { id: 'SYNCLOGS', label: `Fila de Sync (${syncLogs.length})`, count: syncLogs.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded font-bold transition flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'bg-[#121820] text-gray-400 hover:text-white border border-[#1E293B]'
              }`}
            >
              <Table size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo da Tabela Selecionada */}
        <div className="flex-1 overflow-auto p-4 bg-[#070A0E]">
          {activeTab === 'PRODUCTS' && (
            <table className="w-full text-left text-xs border border-[#1E293B]">
              <thead className="bg-[#121820] text-gray-400 uppercase sticky top-0 border-b border-[#1E293B]">
                <tr>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Código de Barras</th>
                  <th className="py-2.5 px-3">Descrição</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3 text-right">Preço</th>
                  <th className="py-2.5 px-3 text-right">Estoque</th>
                  <th className="py-2.5 px-2 text-center">Un</th>
                  <th className="py-2.5 px-2 text-center w-20">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2332]">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      Tabela de produtos vazia. Clique em "Restaurar Padrão" para repovoar.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-[#121820]/60 group">
                      <td className="py-2 px-3 text-amber-300 font-bold">{p.sku}</td>
                      <td className="py-2 px-3 text-gray-400">{p.barcode}</td>
                      <td className="py-2 px-3 font-sans font-medium text-white">{p.description}</td>
                      <td className="py-2 px-3 text-gray-400">{p.category}</td>
                      <td className="py-2 px-3 text-right text-emerald-400 font-bold tabular-numbers">
                        {formatCurrency(p.priceCents)}
                      </td>
                      <td className="py-2 px-3 text-right text-cyan-400 font-bold tabular-numbers">
                        {p.stock}
                      </td>
                      <td className="py-2 px-2 text-center text-gray-500">{p.unit}</td>
                      <td className="py-2 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingProduct(p)}
                            className="p-1 hover:bg-amber-950/60 text-gray-500 hover:text-amber-400 rounded transition"
                            title="Editar este produto"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.description)}
                            className="p-1 hover:bg-red-950/60 text-gray-500 hover:text-red-400 rounded transition"
                            title="Apagar este produto"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'SALES' && (
            <table className="w-full text-left text-xs border border-[#1E293B]">
              <thead className="bg-[#121820] text-gray-400 uppercase sticky top-0 border-b border-[#1E293B]">
                <tr>
                  <th className="py-2.5 px-3"># Sequência</th>
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">Operador</th>
                  <th className="py-2.5 px-3">Itens</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-center">Pagamento</th>
                  <th className="py-2.5 px-3 text-center">Status Sync</th>
                  <th className="py-2.5 px-2 text-center w-16">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2332]">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      Nenhuma venda registrada no banco ainda.
                    </td>
                  </tr>
                ) : (
                  sales.map((s) => (
                    <tr key={s.id} className="hover:bg-[#121820]/60 group">
                      <td className="py-2 px-3 text-emerald-400 font-bold">
                        #{s.sequenceId.toString().padStart(6, '0')}
                      </td>
                      <td className="py-2 px-3 text-gray-400">
                        {new Date(s.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 px-3 text-white">{s.operatorName}</td>
                      <td className="py-2 px-3 text-gray-300">{s.items.length} volumes</td>
                      <td className="py-2 px-3 text-right text-emerald-400 font-bold tabular-numbers">
                        {formatCurrency(s.totalCents)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-[#1A2332] text-amber-300 text-[10px] font-bold">
                          {s.payments[0]?.method || 'N/A'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.synced 
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {s.synced ? 'SINCRONIZADO' : 'PENDENTE (LOCAL)'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => handleDeleteSale(s.id, s.sequenceId)}
                          className="p-1 hover:bg-red-950/60 text-gray-500 hover:text-red-400 rounded transition"
                          title="Apagar este registro de venda"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'SESSIONS' && (
            <div className="space-y-3">
              {sessions.map((sess) => (
                <div key={sess.id} className="p-4 bg-[#121820] border border-[#1E293B] rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-white font-bold">CAIXA {sess.cashierId} - {sess.operatorName}</div>
                    <div className="text-gray-400 text-xs">Aberto em: {new Date(sess.openedAt).toLocaleString('pt-BR')}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 uppercase">Fundo Inicial de Troco:</span>
                    <div className="text-emerald-400 font-bold text-base">
                      {formatCurrency(sess.initialAmountCents)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'SYNCLOGS' && (
            <div className="space-y-2">
              {syncLogs.length === 0 ? (
                <p className="text-center text-gray-500 py-12">Fila de sincronização vazia. Todas as operações integradas.</p>
              ) : (
                syncLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-[#121820] border border-[#1E293B] rounded flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-white">Venda ID: {log.saleId}</span>
                      <p className="text-gray-400">Última tentativa: {new Date(log.lastAttemptAt).toLocaleString('pt-BR')}</p>
                    </div>
                    <span className="px-2 py-1 rounded bg-[#1A2332] text-cyan-400 font-bold">
                      Status: {log.status} (Tentativas: {log.attempts})
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="px-6 py-3 bg-[#121820] border-t border-[#1E293B] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Shield size={14} className="text-emerald-400" />
            Dados persistidos localmente no banco IndexedDB com garantia ACID.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-white font-bold transition"
          >
            [ESC] Fechar Painel
          </button>
        </div>

        {/* Modal para Cadastro de Produto */}
        <AddProductModal
          isOpen={isAddProductOpen}
          onClose={() => setIsAddProductOpen(false)}
          onProductAdded={async () => {
            await loadData();
            onDataChanged?.();
          }}
        />

        {/* Modal para Edição de Produto */}
        <EditProductModal
          product={editingProduct}
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          onProductUpdated={async () => {
            await loadData();
            onDataChanged?.();
          }}
        />

      </div>
    </div>
  );
};
