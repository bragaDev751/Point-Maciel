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

  // Verifica se é açaí ou sorvete para exibir o contador de bolas/unidades
  const isAcaiOrSorvete = useMemo(() => {
    const cat = produto?.categoria_nome?.trim().toLowerCase() || "";
    return cat.includes('açaí') || cat.includes('sorvete');
  }, [produto]);

  // Lógica de filtragem BLINDADA (Ignora Plurais, Espaços e Maiúsculas)
  const { sabores, adicionais } = useMemo(() => {
    if (!produto) return { sabores: [], adicionais: [] };
    
    // Função interna para limpar o texto (remove espaços, deixa minúsculo e remove o 's' do final)
    const normalizar = (txt: string) => 
      txt?.trim().toLowerCase().replace(/s$/, "") || "";

    const categoriaProduto = normalizar(produto.categoria_nome);

    const filtrados = complementos.filter(comp => {
      const categoriaComp = normalizar(comp.categoria_pai);
      
      // Compara se as categorias limpas batem
      const nomesBatem = categoriaComp === categoriaProduto;
      return nomesBatem && comp.disponivel !== false;
    });

    return {
      // SABORES: Itens com tipo 'sabor' OU itens sem tipo com preço 0 (legado)
      sabores: filtrados.filter(c => 
        c.tipo === 'sabor' || 
        (c.preco === 0 && (!c.tipo || c.tipo === null))
      ),
      // ADICIONAIS: Itens com tipo 'extra' OU itens com preço > 0
      adicionais: filtrados.filter(c => 
        c.tipo === 'extra' || 
        (c.preco > 0 && (!c.tipo || c.tipo === null))
      )
    };
  }, [complementos, produto]);

  if (!produto) return null;

  const handleUpdateQtd = (id: string, delta: number) => {
    setSelecoes(prev => {
      const qtdAtual = prev[id] || 0;
      const novaQtd = qtdAtual + delta;
      
      if (novaQtd < 0) return prev;
      
      if (novaQtd === 0) {
        const { [id]: _, ...resto } = prev;
        return resto;
      }
      
      return { ...prev, [id]: novaQtd };
    });
  };

  // Soma de bolas/sabores selecionados
  const totalBase = sabores.reduce((acc, s) => acc + (selecoes[s.id] || 0), 0);
  
  // Soma do valor dos adicionais
  const precoExtras = adicionais.reduce((acc, a) => 
    acc + ((selecoes[a.id] || 0) * (a.preco || 0)), 0
  );

  const precoTotal = produto.preco + precoExtras;

  const handleConfirm = () => {
    const extrasParaCarrinho: ComplementoSelecao[] = Object.entries(selecoes).map(([id, qtd]) => {
      const itemOriginal = complementos.find(c => c.id === id)!;
      return { ...itemOriginal, quantidade_selecionada: qtd };
    });
    
    onConfirm(produto, 1, extrasParaCarrinho);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <motion.div 
          initial={{ y: "100%" }} 
          animate={{ y: 0 }} 
          exit={{ y: "100%" }}
          className="bg-[#1a011a] border border-white/10 w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl my-auto"
        >
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-black uppercase italic text-white text-center">{produto.nome}</h2>
            
            {isAcaiOrSorvete && (
              <div className="mt-2 mb-6 px-4 py-1 bg-[#ffcc00]/10 border border-[#ffcc00]/20 rounded-full">
                  <span className="text-[#ffcc00] text-[10px] font-black uppercase tracking-widest">
                    {totalBase} {totalBase === 1 ? 'Selecionado' : 'Selecionados'}
                  </span>
              </div>
            )}

            <div className="w-full space-y-6 mb-8 max-h-[350px] overflow-y-auto pr-2 no-scrollbar text-left">
              {/* SEÇÃO DE SABORES (BOLAS) */}
              {sabores.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase text-white/30 tracking-widest block ml-2 italic">
                    Escolha os Sabores
                  </label>
                  {sabores.map((s) => (
                    <div key={s.id} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                      <span className="text-xs font-bold uppercase text-white">{s.nome}</span>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => handleUpdateQtd(s.id, -1)} 
                          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white flex items-center justify-center active:scale-90 transition-transform"
                        >
                          -
                        </button>
                        <span className="text-sm font-black text-[#ffcc00] w-4 text-center">{selecoes[s.id] || 0}</span>
                        <button 
                          onClick={() => handleUpdateQtd(s.id, 1)} 
                          className="w-8 h-8 rounded-lg bg-[#ffcc00] text-[#3b013b] font-bold flex items-center justify-center active:scale-90 transition-transform"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SEÇÃO DE EXTRAS (ACOMPANHAMENTOS) */}
              {adicionais.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase text-white/30 tracking-widest block ml-2 italic">
                    Acompanhamentos (Opcional)
                  </label>
                  {adicionais.map((a) => (
                    <div key={a.id} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase text-white">{a.nome}</span>
                        <span className="text-[9px] font-black text-[#ffcc00]">
                          {a.preco === 0 || !a.preco ? 'GRÁTIS' : `+ R$ ${a.preco.toFixed(2)}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => handleUpdateQtd(a.id, -1)} 
                          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white flex items-center justify-center active:scale-90 transition-transform"
                        >
                          -
                        </button>
                        <span className="text-sm font-black text-white w-4 text-center">{selecoes[a.id] || 0}</span>
                        <button 
                          onClick={() => handleUpdateQtd(a.id, 1)} 
                          className="w-8 h-8 rounded-lg bg-[#ffcc00] text-[#3b013b] font-bold flex items-center justify-center active:scale-90 transition-transform"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* FEEDBACK CASO NÃO TENHA NADA */}
              {sabores.length === 0 && adicionais.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-[10px] text-white/20 italic uppercase tracking-widest">
                    Nenhum complemento cadastrado para esta categoria.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 w-full">
              <button 
                onClick={onClose} 
                className="flex-1 py-4 font-bold text-white/40 uppercase text-[10px] tracking-widest"
              >
                Voltar
              </button>
              <button 
                onClick={handleConfirm}
                disabled={isAcaiOrSorvete && totalBase === 0}
                className={`flex-[2] py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg transition-all tracking-widest ${
                    (isAcaiOrSorvete && totalBase > 0) || !isAcaiOrSorvete 
                    ? 'bg-[#ffcc00] text-[#3b013b] active:scale-95' 
                    : 'bg-white/5 text-white/20 cursor-not-allowed'
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