"use client";
import { useState, useMemo } from "react";
import { Produto, Complemento, ComplementoSelecao } from "@/app/types/Index";
import { motion, AnimatePresence } from "framer-motion";

interface SelectionModalProps {
  produto: Produto | null;
  complementos: Complemento[];
  onClose: () => void;
  onConfirm: (
    p: Produto,
    quantidade: number,
    extras?: ComplementoSelecao[],
  ) => void;
}

export const SelectionModal = ({
  produto,
  complementos,
  onClose,
  onConfirm,
}: SelectionModalProps) => {
  const [selecoes, setSelecoes] = useState<{ [key: string]: number }>({});

  const isAcaiOrSorvete = useMemo(() => {
    const cat = produto?.categoria_nome?.trim().toLowerCase() || "";
    return cat.includes("açaí") || cat.includes("sorvete");
  }, [produto]);

  const limiteSabores = produto?.qtd_sabores_gratis ?? 0;
  const limiteExtras = produto?.qtd_extras_max ?? 0;

  const { sabores, adicionais } = useMemo(() => {
    if (!produto) return { sabores: [], adicionais: [] };

    const categoriaProduto = produto.categoria_nome?.trim().toLowerCase();

    const filtrados = complementos.filter((comp) => {
      const catPai = comp.categoria_pai?.trim().toLowerCase() || "";
      const catProd = categoriaProduto || "";

      const categoriasDeLanches = ["hambúrgueres", "artesanais"];

      const pertenceAoGrupoDeLanches =
        categoriasDeLanches.includes(catProd) &&
        categoriasDeLanches.includes(catPai);

      const eMesmaCategoria =
        catProd.includes(catPai) || catPai.includes(catProd);

      return (
        (pertenceAoGrupoDeLanches || eMesmaCategoria) &&
        comp.disponivel === true
      );
    });

    return {
      sabores: filtrados.filter((c) => c.tipo === "sabor"),
      adicionais: filtrados.filter((c) => c.tipo === "extra"),
    };
  }, [complementos, produto]);

  const totalSaboresSelecionados = sabores.reduce(
    (acc, s) => acc + (selecoes[s.id] || 0),
    0
  );

  const totalExtrasSelecionados = adicionais.reduce(
    (acc, a) => acc + (selecoes[a.id] || 0),
    0
  );

  const precoExtras = adicionais.reduce(
    (acc, a) => acc + (selecoes[a.id] || 0) * (a.preco || 0),
    0
  );

  if (!produto) return null;

  const handleUpdateQtd = (
    id: string,
    delta: number,
    tipo: "sabor" | "extra"
  ) => {
    setSelecoes((prev) => {
      const qtdAtual = prev[id] || 0;
      const novaQtd = qtdAtual + delta;

      if (novaQtd < 0) return prev;

      if (delta > 0) {
        if (tipo === "sabor" && totalSaboresSelecionados >= limiteSabores)
          return prev;

        if (tipo === "extra" && totalExtrasSelecionados >= limiteExtras)
          return prev;
      }

      if (novaQtd === 0) {
        const { [id]: _, ...resto } = prev;
        return resto;
      }

      return { ...prev, [id]: novaQtd };
    });
  };

  const handleConfirm = () => {
    const extrasSelecionados: ComplementoSelecao[] = Object.entries(
      selecoes,
    ).map(([id, qtd]) => {
      const itemOriginal = complementos.find((c) => c.id === id)!;
      return { ...itemOriginal, quantidade_selecionada: qtd };
    });

    const descricaoFormatada = extrasSelecionados
      .map((e) => {
        if (e.tipo === "extra") return `➕ ${e.nome}`;
        if (e.tipo === "sabor") return e.nome;

        return e.preco > 0 ? `➕ ${e.nome}` : e.nome;
      })
      .join("\n");

    const produtoComDescricao = {
      ...produto!,
      descricao: descricaoFormatada,
    };

    onConfirm(produtoComDescricao, 1, extrasSelecionados);
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
            <h2 className="text-xl font-black uppercase italic text-white text-center">
              {produto.nome}
            </h2>

            {isAcaiOrSorvete && (
              <div className="mt-3 mb-6 flex flex-col items-center gap-1">
                <div className="px-4 py-1 bg-[#ffcc00]/10 border border-[#ffcc00]/20 rounded-full">
                  <span className="text-[#ffcc00] text-[10px] font-black uppercase tracking-widest">
                    Sabores: {totalSaboresSelecionados}/{limiteSabores} • Extras: {totalExtrasSelecionados}/{limiteExtras}
                  </span>
                </div>
              </div>
            )}

            <div className="w-full space-y-6 mb-8 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
              
              {/* SABORES */}
              {sabores.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase text-white/30 tracking-widest block ml-2 italic">
                    Escolha os Sabores
                  </label>

                  {sabores.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5"
                    >
                      <span className="text-xs font-bold uppercase text-white">
                        {s.nome}
                      </span>

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleUpdateQtd(s.id, -1, "sabor")}
                          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white flex items-center justify-center"
                        >
                          -
                        </button>

                        <span className="text-sm font-black text-[#ffcc00] w-4 text-center">
                          {selecoes[s.id] || 0}
                        </span>

                        <button
                          onClick={() => handleUpdateQtd(s.id, 1, "sabor")}
                          className="w-8 h-8 rounded-lg bg-[#ffcc00] text-[#3b013b] font-bold flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ADICIONAIS */}
              {adicionais.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase text-white/30 tracking-widest block ml-2 italic">
                    Acompanhamentos
                  </label>

                  {adicionais.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase text-white">
                          {a.nome}
                        </span>
                        <span className="text-[9px] font-black text-[#ffcc00]">
                          {a.preco === 0
                            ? "GRÁTIS"
                            : `+ R$ ${a.preco.toFixed(2)}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleUpdateQtd(a.id, -1, "extra")}
                          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white flex items-center justify-center"
                        >
                          -
                        </button>

                        <span className="text-sm font-black text-white w-4 text-center">
                          {selecoes[a.id] || 0}
                        </span>

                        <button
                          onClick={() => handleUpdateQtd(a.id, 1, "extra")}
                          className="w-8 h-8 rounded-lg bg-[#ffcc00] text-[#3b013b] font-bold flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
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
                disabled={
                  isAcaiOrSorvete &&
                  totalSaboresSelecionados === 0 &&
                  sabores.length > 0
                }
                className={`flex-[2] py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest ${
                  isAcaiOrSorvete &&
                  totalSaboresSelecionados === 0 &&
                  sabores.length > 0
                    ? "bg-white/5 text-white/20"
                    : "bg-[#ffcc00] text-[#3b013b] shadow-lg shadow-yellow-400/20"
                }`}
              >
                Confirmar • R$ {(produto.preco + precoExtras).toFixed(2)}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};