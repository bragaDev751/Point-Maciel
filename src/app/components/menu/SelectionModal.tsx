"use client";
import { useState, useMemo } from "react";
import { Produto, Complemento } from "@/app/types/Index";
import { motion, AnimatePresence } from "framer-motion";

interface ComplementoSelecao extends Complemento {
  quantidade_selecionada: number;
}

interface SelectionModalProps {
  produto: Produto | null;
  complementos: Complemento[];
  onClose: () => void;
  onConfirm: (p: Produto, quantidade: number, extras?: ComplementoSelecao[]) => void;
}

export const SelectionModal = ({ produto, complementos, onClose, onConfirm }: SelectionModalProps) => {
  const [selecoes, setSelecoes] = useState<{ [key: string]: number }>({});

  const isAcai = useMemo(() => {
    return produto?.categoria_nome?.trim().toLowerCase() === 'açaí';
  }, [produto]);

  // Lógica corrigida e sem duplicação
  const { sabores, adicionais } = useMemo(() => {
    if (!produto) return { sabores: [], adicionais: [] };
    
    // FILTRO: Pertence à categoria E está disponível (não é false)
    const filtrados = complementos.filter(comp => 
      comp.categoria_pai?.trim().toLowerCase() === produto.categoria_nome?.trim().toLowerCase() &&
      comp.disponivel !== false
    );

    return {
      sabores: filtrados.filter(c => c.preco === 0 || c.preco === null),
      adicionais: filtrados.filter(c => c.preco > 0)
    };
  }, [complementos, produto]);

  if (!produto) return null;

  const handleUpdateQtd = (id: string, delta: number) => {
    setSelecoes(prev => {
      const novaQtd = (prev[id] || 0) + delta;
      if (novaQtd <= 0) {
        const { [id]: _, ...resto } = prev;
        return resto;
      }
      return { ...prev, [id]: novaQtd };
    });
  };

  const totalBase = sabores.reduce((acc, s) => acc + (selecoes[s.id] || 0), 0);
  
  const precoExtras = adicionais.reduce((acc, a) => 
    acc + ((selecoes[a.id] || 0) * (a.preco || 0)), 0
  );

  const precoTotal = (produto.preco * (totalBase || 1)) + precoExtras;

  const handleConfirm = () => {
    const extrasParaCarrinho: ComplementoSelecao[] = Object.entries(selecoes).map(([id, qtd]) => {
      const itemOriginal = complementos.find(c => c.id === id)!;
      return { ...itemOriginal, quantidade_selecionada: qtd };
    });

    onConfirm(produto, totalBase || 1, extrasParaCarrinho);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <motion.div 
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          className="bg-[#1a011a] border border-white/10 w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl my-auto"
        >
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-black uppercase italic text-white text-center">{produto.nome}</h2>
            
            <div className="mt-2 mb-6 px-4 py-1 bg-[#ffcc00]/10 border border-[#ffcc00]/20 rounded-full">
                <span className="text-[#ffcc00] text-[10px] font-black uppercase tracking-widest">
                   {totalBase} {isAcai 
                    ? (totalBase === 1 ? 'Adicional selecionado' : 'Adicionais selecionados')
                    : (totalBase === 1 ? 'Bola selecionada' : 'Bolas selecionadas')}
                </span>
            </div>

            <div className="w-full space-y-6 mb-8 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
              {sabores.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase text-white/30 tracking-widest block ml-2 text-left">
                    {isAcai ? 'Escolha os Adicionais' : 'Escolha os Sabores'}
                  </label>
                  {sabores.map((s) => (
                    <div key={s.id} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                      <span className="text-xs font-bold uppercase text-white">{s.nome}</span>
                      <div className="flex items-center gap-4">
                        <button onClick={() => handleUpdateQtd(s.id, -1)} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white flex items-center justify-center">-</button>
                        <span className="text-sm font-black text-[#ffcc00] w-4 text-center">{selecoes[s.id] || 0}</span>
                        <button onClick={() => handleUpdateQtd(s.id, 1)} className="w-8 h-8 rounded-lg bg-[#ffcc00] text-[#3b013b] font-bold flex items-center justify-center">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {adicionais.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase text-white/30 tracking-widest block ml-2 text-left">
                    {isAcai ? 'Extras (Opcional)' : 'Adicionais (Opcional)'}
                  </label>
                  {adicionais.map((a) => (
                    <div key={a.id} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase text-white">{a.nome}</span>
                        <span className="text-[9px] font-black text-[#ffcc00]">+ R$ {a.preco?.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <button onClick={() => handleUpdateQtd(a.id, -1)} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white flex items-center justify-center">-</button>
                        <span className="text-sm font-black text-white w-4 text-center">{selecoes[a.id] || 0}</span>
                        <button onClick={() => handleUpdateQtd(a.id, 1)} className="w-8 h-8 rounded-lg bg-[#ffcc00] text-[#3b013b] font-bold flex items-center justify-center">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 w-full">
              <button onClick={onClose} className="flex-1 py-4 font-bold text-white/40 uppercase text-[10px]">Voltar</button>
              <button 
                onClick={handleConfirm}
                disabled={totalBase === 0}
                className={`flex-[2] py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg transition-all ${
                    totalBase > 0 ? 'bg-[#ffcc00] text-[#3b013b]' : 'bg-white/5 text-white/20 cursor-not-allowed'
                }`}
              >
                Confirmar • R$ {precoTotal.toFixed(2)}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};