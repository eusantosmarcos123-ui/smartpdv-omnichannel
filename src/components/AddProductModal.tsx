import React, { useState } from 'react';
import { PlusCircle, X, Check, Barcode, DollarSign, Package } from 'lucide-react';
import { db } from '../database/db';
import type { Product } from '../types';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: () => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onProductAdded,
}) => {
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Mercearia');
  const [unit, setUnit] = useState<'UN' | 'KG' | 'LT' | 'CX'>('UN');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('100');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !barcode.trim() || !price.trim()) {
      alert('Preencha a descrição, código de barras e preço do produto.');
      return;
    }

    const priceCents = Math.round(parseFloat(price.replace(',', '.')) * 100);
    const stockQty = parseFloat(stock) || 0;

    const newProduct: Product = {
      id: crypto.randomUUID(),
      sku: sku.trim() || barcode.slice(-5),
      barcode: barcode.trim(),
      description: description.trim().toUpperCase(),
      category: category.trim(),
      unit: unit,
      priceCents: priceCents,
      costCents: Math.round(priceCents * 0.7), // Custo padrão estimado em 70%
      stock: stockQty,
      isWeighable: unit === 'KG',
    };

    try {
      await db.products.add(newProduct);
      onProductAdded();
      // Limpa os campos
      setSku('');
      setBarcode('');
      setDescription('');
      setPrice('');
      setStock('100');
      onClose();
    } catch (err: any) {
      alert('Erro ao salvar no banco de dados: ' + (err.message || 'Código já existente'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#0B0F14] border-2 border-[#1E293B] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-gray-100 font-mono animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#121820] border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="text-emerald-400" size={20} />
            <h2 className="text-base font-bold text-white">Cadastrar Novo Produto</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#1A2332] rounded text-gray-400 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs uppercase text-gray-400 mb-1">Descrição do Produto *</label>
            <input
              type="text"
              autoFocus
              required
              placeholder="Ex: CAFE PILAO TRADICIONAL 500G"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#070A0E] border border-[#1E293B] rounded px-3 py-2 text-white font-sans focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase text-gray-400 mb-1 flex items-center gap-1">
                <Barcode size={13} className="text-cyan-400" /> Código EAN *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 7891234567890"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full bg-[#070A0E] border border-[#1E293B] rounded px-3 py-2 text-emerald-400 font-mono focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-gray-400 mb-1">SKU / Código Balança</label>
              <input
                type="text"
                placeholder="Ex: 00108"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full bg-[#070A0E] border border-[#1E293B] rounded px-3 py-2 text-amber-300 font-mono focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs uppercase text-gray-400 mb-1 flex items-center gap-1">
                <DollarSign size={13} className="text-emerald-400" /> Preço (R$) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 14,90"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-[#070A0E] border border-[#1E293B] rounded px-3 py-2 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-gray-400 mb-1">Unidade</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="w-full bg-[#070A0E] border border-[#1E293B] rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-sm"
              >
                <option value="UN">UN (Unidade)</option>
                <option value="KG">KG (Pesável)</option>
                <option value="LT">LT (Litro)</option>
                <option value="CX">CX (Caixa)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase text-gray-400 mb-1 flex items-center gap-1">
                <Package size={13} className="text-cyan-400" /> Estoque
              </label>
              <input
                type="number"
                placeholder="100"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-[#070A0E] border border-[#1E293B] rounded px-3 py-2 text-cyan-300 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase text-gray-400 mb-1">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#070A0E] border border-[#1E293B] rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-sm"
            >
              <option value="Mercearia">Mercearia</option>
              <option value="Bebidas">Bebidas</option>
              <option value="Hortifruti">Hortifruti</option>
              <option value="Acougue">Açougue</option>
              <option value="Padaria">Padaria</option>
              <option value="Laticinios">Laticínios</option>
              <option value="Limpeza">Limpeza</option>
              <option value="Higiene">Higiene</option>
            </select>
          </div>

          {/* Rodapé Form */}
          <div className="pt-4 border-t border-[#1E293B] flex justify-between items-center">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition"
            >
              <Check size={16} /> Salvar Produto
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
