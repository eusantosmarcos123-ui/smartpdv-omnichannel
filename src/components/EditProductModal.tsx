import React, { useState, useEffect } from 'react';
import { Edit3, X, Check, Barcode, DollarSign, Package } from 'lucide-react';
import { db } from '../database/db';
import type { Product } from '../types';

interface EditProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated: () => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onProductUpdated,
}) => {
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Mercearia');
  const [unit, setUnit] = useState<'UN' | 'KG' | 'LT' | 'CX'>('UN');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');

  useEffect(() => {
    if (product) {
      setSku(product.sku || '');
      setBarcode(product.barcode || '');
      setDescription(product.description || '');
      setCategory(product.category || 'Mercearia');
      setUnit(product.unit || 'UN');
      setPrice(((product.priceCents || 0) / 100).toFixed(2).replace('.', ','));
      setStock((product.stock || 0).toString());
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !barcode.trim() || !price.trim()) {
      alert('Preencha a descrição, código de barras e preço do produto.');
      return;
    }

    const priceCents = Math.round(parseFloat(price.replace(',', '.')) * 100);
    const stockQty = parseFloat(stock) || 0;

    const updatedProduct: Partial<Product> = {
      sku: sku.trim() || barcode.slice(-5),
      barcode: barcode.trim(),
      description: description.trim().toUpperCase(),
      category: category.trim(),
      unit: unit,
      priceCents: priceCents,
      costCents: Math.round(priceCents * 0.7),
      stock: stockQty,
      isWeighable: unit === 'KG',
    };

    try {
      await db.products.update(product.id, updatedProduct);
      onProductUpdated();
      onClose();
    } catch (err: any) {
      alert('Erro ao atualizar produto: ' + (err.message || 'Falha no banco'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#0B0F14] border-2 border-[#1E293B] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-gray-100 font-mono animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#121820] border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="text-amber-400" size={20} />
            <h2 className="text-base font-bold text-white">Editar Produto</h2>
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
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#070A0E] border border-[#1E293B] rounded px-3 py-2 text-white font-sans focus:outline-none focus:border-amber-400 text-sm"
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
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full bg-[#070A0E] border border-[#1E293B] rounded px-3 py-2 text-emerald-400 font-mono focus:outline-none focus:border-amber-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-gray-400 mb-1">SKU / Código Balança</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full bg-[#070A0E] border border-[#1E293B] rounded px-3 py-2 text-amber-300 font-mono focus:outline-none focus:border-amber-400 text-sm"
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
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-[#070A0E] border border-[#1E293B] rounded px-3 py-2 text-emerald-400 font-bold focus:outline-none focus:border-amber-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-gray-400 mb-1">Unidade</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="w-full bg-[#070A0E] border border-[#1E293B] rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400 text-sm"
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
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-[#070A0E] border border-[#1E293B] rounded px-3 py-2 text-cyan-300 focus:outline-none focus:border-amber-400 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase text-gray-400 mb-1">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#070A0E] border border-[#1E293B] rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400 text-sm"
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
              className="px-5 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center gap-2 shadow-lg transition"
            >
              <Check size={16} /> Salvar Alterações
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
