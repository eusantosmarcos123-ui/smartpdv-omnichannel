import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { formatCurrency } from '../utils/barcodeParser';
import type { PaymentMethod, PaymentEntry } from '../types';
import { CheckCircle2, QrCode, Banknote, CreditCard, X, ShieldAlert } from 'lucide-react';

interface PaymentModalProps {
  totalCents: number;
  isOpen: boolean;
  onClose: () => void;
  onFinishSale: (payments: PaymentEntry[], changeCents: number) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  totalCents,
  isOpen,
  onClose,
  onFinishSale,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('DINHEIRO');
  const [receivedInput, setReceivedInput] = useState<string>('');
  const [pixQrCodeDataUrl, setPixQrCodeDataUrl] = useState<string>('');
  const [pixStatus, setPixStatus] = useState<'WAITING' | 'CONFIRMED'>('WAITING');

  const receivedCents = receivedInput ? Math.round(parseFloat(receivedInput.replace(',', '.')) * 100) : totalCents;
  const changeCents = Math.max(0, receivedCents - totalCents);

  // Gera Pix Dinâmico e simula escuta de Webhook instantâneo (< 2s)
  useEffect(() => {
    if (isOpen && selectedMethod === 'PIX') {
      const pixPayload = `00020126580014BR.GOV.BCB.PIX0136smartpdv-${Date.now()}520400005303986540${(totalCents / 100).toFixed(2)}5802BR5920SMARTPDV OMNICHANNEL6009SAO PAULO62070503***6304E2CA`;
      QRCode.toDataURL(pixPayload, { margin: 1, width: 220 })
        .then((url) => setPixQrCodeDataUrl(url))
        .catch(() => {});

      // Simulação de confirmação bancária Pix em 3 segundos
      const timer = setTimeout(() => {
        setPixStatus('CONFIRMED');
      }, 3500);

      return () => clearTimeout(timer);
    } else {
      setPixStatus('WAITING');
    }
  }, [isOpen, selectedMethod, totalCents]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === '1') {
        setSelectedMethod('DINHEIRO');
      } else if (e.key === '2') {
        setSelectedMethod('PIX');
      } else if (e.key === '3') {
        setSelectedMethod('DEBITO');
      } else if (e.key === '4') {
        setSelectedMethod('CREDITO');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!isOpen) return null;

  const handleConfirm = () => {
    const payment: PaymentEntry = {
      method: selectedMethod,
      amountCents: totalCents,
      status: 'COMPLETED',
    };
    onFinishSale([payment], changeCents);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden text-gray-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1E293B]/60 border-b border-[#1F2937]">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Banknote className="text-emerald-400" size={24} />
              Finalizar Venda / Pagamento
            </h2>
            <p className="text-xs text-gray-400">Pressione 1 a 4 para trocar a forma ou Enter para confirmar</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Total a Receber */}
        <div className="px-6 py-4 bg-[#0B0F17]/90 border-b border-[#1F2937] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total a Pagar</span>
            <div className="text-3xl font-black text-emerald-400 tabular-numbers">
              {formatCurrency(totalCents)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Troco a Devolver</span>
            <div className="text-2xl font-bold text-amber-400 tabular-numbers">
              {formatCurrency(changeCents)}
            </div>
          </div>
        </div>

        {/* Seleção de Formas de Pagamento */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-3">
            {[
              { id: 'DINHEIRO', num: '1', label: 'Dinheiro', icon: Banknote },
              { id: 'PIX', num: '2', label: 'Pix Instantâneo', icon: QrCode },
              { id: 'DEBITO', num: '3', label: 'Débito', icon: CreditCard },
              { id: 'CREDITO', num: '4', label: 'Crédito', icon: CreditCard },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = selectedMethod === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethod(m.id as PaymentMethod)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-sm font-medium ${
                    isSelected
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/50'
                      : 'bg-[#1E293B]/40 border-[#1F2937] text-gray-300 hover:bg-[#1E293B]'
                  }`}
                >
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono mb-1">
                    [{m.num}]
                  </span>
                  <Icon size={22} className="mb-1" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Painel Específico da Forma */}
          {selectedMethod === 'DINHEIRO' && (
            <div className="bg-[#0B0F17] p-4 rounded-lg border border-[#1F2937] space-y-3">
              <label className="block text-xs font-semibold text-gray-300 uppercase">
                Valor Recebido (R$):
              </label>
              <input
                type="text"
                autoFocus
                placeholder={(totalCents / 100).toFixed(2)}
                value={receivedInput}
                onChange={(e) => setReceivedInput(e.target.value)}
                className="w-full bg-[#111827] border border-[#1F2937] rounded-lg px-4 py-3 text-2xl font-mono text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <ShieldAlert size={14} className="text-amber-400" />
                Abertura da gaveta de dinheiro (pulso RJ11 ESC/POS) ocorrerá no Enter.
              </p>
            </div>
          )}

          {selectedMethod === 'PIX' && (
            <div className="bg-[#0B0F17] p-5 rounded-lg border border-[#1F2937] flex flex-col items-center text-center space-y-3">
              <span className="text-xs text-cyan-400 font-semibold tracking-wide uppercase">
                Aguardando Pagamento do Cliente via Webhook Instantâneo
              </span>
              {pixQrCodeDataUrl && (
                <div className="p-2 bg-white rounded-lg shadow-inner">
                  <img src={pixQrCodeDataUrl} alt="QR Code Pix" className="w-44 h-44" />
                </div>
              )}
              {pixStatus === 'CONFIRMED' ? (
                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/60 px-4 py-2 rounded-full border border-emerald-500/30 text-sm font-semibold animate-bounce">
                  <CheckCircle2 size={18} /> Pix Confirmado pelo Banco! Pressione Enter para imprimir.
                </div>
              ) : (
                <div className="text-xs text-gray-400 animate-pulse">
                  Escutando confirmação de liquidação via SPI/BCB em tempo real...
                </div>
              )}
            </div>
          )}

          {(selectedMethod === 'DEBITO' || selectedMethod === 'CREDITO') && (
            <div className="bg-[#0B0F17] p-5 rounded-lg border border-[#1F2937] text-center space-y-2">
              <CreditCard size={36} className="mx-auto text-cyan-400" />
              <p className="text-sm font-medium text-gray-200">Insira ou Aproxime o Cartão no PinPad TEF</p>
              <p className="text-xs text-gray-400">Comunicação direta com o terminal de checkout autorizada.</p>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="px-6 py-4 bg-[#1E293B]/40 border-t border-[#1F2937] flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition"
          >
            [ESC] Voltar ao Caixa
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition"
          >
            <CheckCircle2 size={18} />
            [ENTER] Confirmar e Emitir Cupom
          </button>
        </div>

      </div>
    </div>
  );
};
